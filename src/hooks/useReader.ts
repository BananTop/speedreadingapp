import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReaderSettings } from '../types';
import { endsWithPause } from '../utils/textProcessor';
import { savePosition } from '../utils/storage';

const RAMP_MS = 12000; // ramp-up duration
const RAMP_START_FRACTION = 0.7; // begin at 70% of target speed

export interface ReaderState {
  index: number; // word index at the start of the current batch
  maxIndex: number; // furthest word reached
  batch: string[]; // words currently shown
  isPlaying: boolean;
  total: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  nextBatch: () => void;
  prevBatch: () => void;
  seek: (index: number) => void;
  jumpToMax: () => void;
}

export function useReader(
  words: string[],
  settings: ReaderSettings,
  initial: { index: number; maxIndex: number }
): ReaderState {
  const [index, setIndex] = useState(initial.index);
  const [maxIndex, setMaxIndex] = useState(initial.maxIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  const batchSize = Math.max(1, settings.batchSize);
  const total = words.length;

  // Refs mirror state so the scheduler closure always reads fresh values.
  const indexRef = useRef(index);
  const settingsRef = useRef(settings);
  const timerRef = useRef<number | null>(null);
  const playStartRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Throttled persistence of position + max.
  const persist = useCallback((i: number, m: number) => {
    if (saveTimerRef.current !== null) return;
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void savePosition({ index: i, maxIndex: m });
    }, 800);
  }, []);

  // Compute how long to display the batch starting at `i`.
  const delayFor = useCallback(
    (i: number): number => {
      const s = settingsRef.current;
      const baseMsPerWord = 60000 / s.wpm;
      let delay = baseMsPerWord * batchSize;

      // Ramp-up: slower at the start, easing to full speed.
      const elapsed = performance.now() - playStartRef.current;
      if (elapsed < RAMP_MS) {
        const t = elapsed / RAMP_MS;
        const speedFraction = RAMP_START_FRACTION + (1 - RAMP_START_FRACTION) * t;
        delay /= speedFraction;
      }

      // Punctuation pause on the last word of the batch.
      if (s.pauseOnPunctuation) {
        const last = words[Math.min(i + batchSize - 1, words.length - 1)];
        const kind = last ? endsWithPause(last) : null;
        if (kind === 'long') delay *= 2.2;
        else if (kind === 'short') delay *= 1.5;
      }
      return delay;
    },
    [batchSize, words]
  );

  // Self-correcting scheduler. Held in a ref so each scheduled step can invoke
  // the next without a self-referential closure (which the linter forbids).
  const tickRef = useRef<() => void>(() => {});
  const tick = useCallback(() => {
    const current = indexRef.current;
    const next = current + batchSize;

    if (next >= total) {
      // Reached the end.
      setIndex(Math.min(current, Math.max(0, total - 1)));
      setIsPlaying(false);
      clearTimer();
      return;
    }

    const target = performance.now() + delayFor(current);
    const remaining = Math.max(0, target - performance.now());
    timerRef.current = window.setTimeout(() => {
      setIndex(next);
      setMaxIndex(m => {
        const nm = Math.max(m, next);
        persist(next, nm);
        return nm;
      });
      indexRef.current = next;
      tickRef.current();
    }, remaining);
  }, [batchSize, total, delayFor, clearTimer, persist]);

  // Keep render-derived mirrors current for the scheduler closure. Runs after
  // commit (every render) so refs reflect the latest state before any tick.
  useEffect(() => {
    indexRef.current = index;
    settingsRef.current = settings;
    tickRef.current = tick;
  });

  const play = useCallback(() => {
    if (total === 0) return;
    if (indexRef.current >= total - 1) {
      // restart from beginning if at the end
      setIndex(0);
      indexRef.current = 0;
    }
    playStartRef.current = performance.now();
    setIsPlaying(true);
  }, [total]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
    persist(indexRef.current, Math.max(maxIndex, indexRef.current));
  }, [clearTimer, persist, maxIndex]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  // Drive the scheduler from the isPlaying flag.
  useEffect(() => {
    if (isPlaying) {
      tick();
      return clearTimer;
    }
    clearTimer();
  }, [isPlaying, tick, clearTimer]);

  const moveTo = useCallback(
    (raw: number) => {
      const clamped = Math.max(0, Math.min(raw, Math.max(0, total - 1)));
      // snap to a batch boundary
      const snapped = clamped - (clamped % batchSize);
      setIndex(snapped);
      indexRef.current = snapped;
      setMaxIndex(m => {
        const nm = Math.max(m, snapped);
        persist(snapped, nm);
        return nm;
      });
      // restart ramp so a manual jump while playing isn't jarring
      playStartRef.current = performance.now();
    },
    [batchSize, total, persist]
  );

  const nextBatch = useCallback(() => moveTo(indexRef.current + batchSize), [moveTo, batchSize]);
  const prevBatch = useCallback(() => moveTo(indexRef.current - batchSize), [moveTo, batchSize]);
  const seek = useCallback((i: number) => moveTo(i), [moveTo]);
  const jumpToMax = useCallback(() => moveTo(maxIndex), [moveTo, maxIndex]);
  const restart = useCallback(() => moveTo(0), [moveTo]);

  // Cleanup on unmount.
  useEffect(() => () => clearTimer(), [clearTimer]);

  const batch = words.slice(index, index + batchSize);

  return {
    index,
    maxIndex,
    batch,
    isPlaying,
    total,
    play,
    pause,
    toggle,
    restart,
    nextBatch,
    prevBatch,
    seek,
    jumpToMax,
  };
}
