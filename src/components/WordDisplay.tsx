import { useMemo } from 'react';
import type { ReaderSettings } from '../types';
import { getORPIndex, getBionicBoldCount } from '../utils/textProcessor';
import type { SwipeBinding } from '../hooks/useSwipeScrub';

interface Props {
  batch: string[];
  words: string[];
  index: number;
  batchSize: number;
  settings: ReaderSettings;
  swipe: SwipeBinding;
  onTap: () => void;
}

// Render one word as JSX, applying bionic bolding and/or ORP coloring.
function renderWord(word: string, settings: ReaderSettings, key: number) {
  const orpIdx = getORPIndex(word);
  const showOrpColor = settings.highlightMode === 'orp';
  const bold = settings.highlightMode === 'bionic' ? getBionicBoldCount(word) : 0;

  const chars = word.split('').map((ch, i) => {
    const isPivot = showOrpColor && i === orpIdx;
    const isBold = bold > 0 && i < bold;
    return (
      <span
        key={i}
        className={isPivot ? 'pivot' : undefined}
        style={isBold ? { fontWeight: 700 } : undefined}
      >
        {ch}
      </span>
    );
  });
  return (
    <span className="word" key={key}>
      {chars}
    </span>
  );
}

export function WordDisplay({ batch, words, index, batchSize, settings, swipe, onTap }: Props) {
  const { dragging, dragPx, handlers } = swipe;

  // Carousel neighbors shown while dragging.
  const currentStart = index - (index % batchSize);
  const neighbors = useMemo(() => {
    const out: { start: number; text: string }[] = [];
    for (let k = -3; k <= 3; k++) {
      const start = currentStart + k * batchSize;
      if (start < 0 || start >= words.length) continue;
      out.push({ start, text: words.slice(start, start + batchSize).join(' ') });
    }
    return out;
  }, [currentStart, batchSize, words]);

  // ORP eye-pin: shift so the first word's pivot char sits at the exact center.
  const pinStyle = useMemo(() => {
    if (!settings.orpCenter || batch.length === 0) return undefined;
    const leftLen = getORPIndex(batch[0]);
    // monospace => 1ch == one character; pin pivot's center on the midline.
    return {
      transform: `translate(calc(-1 * (${leftLen} + 0.5) * 1ch), -50%)`,
    } as React.CSSProperties;
  }, [batch, settings.orpCenter]);

  const fontStyle: React.CSSProperties = { fontSize: `${settings.fontSize}px` };

  return (
    <div
      className="word-stage"
      style={fontStyle}
      {...handlers}
      onClick={() => {
        if (!dragging) onTap();
      }}
    >
      <div className="reticle reticle-top" />
      <div className="reticle reticle-bottom" />

      {dragging ? (
        <div className="carousel" style={{ transform: `translateX(${dragPx}px)` }}>
          {neighbors.map(n => (
            <div
              key={n.start}
              className={`carousel-card ${n.start === currentStart ? 'is-current' : ''}`}
            >
              {n.text}
            </div>
          ))}
        </div>
      ) : settings.orpCenter ? (
        <div className="orp-anchor" style={pinStyle}>
          <span className="orp-line">
            {batch.map((w, i) => (
              <span key={i}>
                {i > 0 ? ' ' : ''}
                {renderWord(w, settings, i)}
              </span>
            ))}
          </span>
        </div>
      ) : (
        <div className="plain-line">
          {batch.map((w, i) => (
            <span key={i}>
              {i > 0 ? ' ' : ''}
              {renderWord(w, settings, i)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
