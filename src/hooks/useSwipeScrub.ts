import { useCallback, useRef, useState } from 'react';

interface SwipeOptions {
  pxPerBatch?: number; // horizontal drag distance that equals one batch
  flingVelocity?: number; // px/ms threshold for the "woosh forward" fling
  onStart: () => void; // called when a drag begins (pause playback)
  onSettle: (deltaBatches: number) => void; // + = go back, - = go forward
  onWoosh: () => void; // fast leftward fling -> jump to furthest word
}

export interface SwipeBinding {
  dragPx: number; // live horizontal offset while dragging (px)
  dragging: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

// Gesture model (per the user's request):
//  - Drag left -> right : rewind, words slide in like a carousel.
//  - Fast flick right -> left + release : "woosh" forward to the furthest word.
export function useSwipeScrub(opts: SwipeOptions): SwipeBinding {
  const { pxPerBatch = 70, flingVelocity = 0.9, onStart, onSettle, onWoosh } = opts;

  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startX = useRef(0);
  const startT = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const active = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      active.current = true;
      startX.current = e.clientX;
      startT.current = performance.now();
      lastX.current = e.clientX;
      lastT.current = startT.current;
      setDragging(true);
      setDragPx(0);
      onStart();
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [onStart]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    setDragPx(e.clientX - startX.current);
  }, []);

  const finish = useCallback(
    (e: React.PointerEvent) => {
      if (!active.current) return;
      active.current = false;
      setDragging(false);

      const totalDx = e.clientX - startX.current;
      const dt = Math.max(1, lastT.current - startT.current);
      const velocity = (lastX.current - startX.current) / dt; // px/ms (signed)

      setDragPx(0);

      // Fast leftward fling -> woosh forward to furthest progress.
      if (velocity <= -flingVelocity && totalDx < -40) {
        onWoosh();
        return;
      }

      // Otherwise settle: right drag (positive) goes back (positive deltaBatches).
      const deltaBatches = Math.round(totalDx / pxPerBatch);
      if (deltaBatches !== 0) onSettle(deltaBatches);
    },
    [flingVelocity, pxPerBatch, onSettle, onWoosh]
  );

  return {
    dragPx,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
