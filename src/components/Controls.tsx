interface Props {
  index: number;
  maxIndex: number;
  total: number;
  isPlaying: boolean;
  wpm: number;
  onToggle: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (index: number) => void;
  onJumpToMax: () => void;
}

export function Controls({
  index,
  maxIndex,
  total,
  isPlaying,
  wpm,
  onToggle,
  onRestart,
  onPrev,
  onNext,
  onSeek,
  onJumpToMax,
}: Props) {
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const behindMax = index < maxIndex;

  return (
    <div className="controls">
      <div className="progress-row">
        <span className="readout">{wpm} WPM</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          {maxIndex > 0 && (
            <div
              className="progress-max"
              style={{ left: `${Math.min(100, ((maxIndex + 1) / total) * 100)}%` }}
              title="Furthest read"
            />
          )}
        </div>
        <span className="readout">{progress}%</span>
      </div>

      <input
        className="scrubber"
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={index}
        onChange={e => onSeek(Number(e.target.value))}
        aria-label="Seek through text"
      />

      <div className="buttons">
        <button className="ctrl-btn" onClick={onRestart} aria-label="Restart">⏮</button>
        <button className="ctrl-btn" onClick={onPrev} aria-label="Previous">◀</button>
        <button className="ctrl-btn play" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '❚❚' : '►'}
        </button>
        <button className="ctrl-btn" onClick={onNext} aria-label="Next">▶</button>
        <button
          className={`ctrl-btn catchup ${behindMax ? 'visible' : ''}`}
          onClick={onJumpToMax}
          aria-label="Catch up to furthest read"
          disabled={!behindMax}
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
