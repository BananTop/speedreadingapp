import type { ReaderSettings, HighlightMode } from '../types';

interface Props {
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

interface Preset {
  label: string;
  wpm: number;
  batchSize: number;
}

const PRESETS: Preset[] = [
  { label: 'Beginner', wpm: 200, batchSize: 1 },
  { label: 'Intermediate', wpm: 350, batchSize: 1 },
  { label: 'Advanced', wpm: 500, batchSize: 2 },
  { label: 'Expert', wpm: 700, batchSize: 3 },
];

const HIGHLIGHTS: { value: HighlightMode; label: string }[] = [
  { value: 'orp', label: 'Focus dot' },
  { value: 'bionic', label: 'Bionic' },
  { value: 'none', label: 'Plain' },
];

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <label className="field-label">Difficulty presets</label>
        <div className="preset-row">
          {PRESETS.map(p => {
            const active = settings.wpm === p.wpm && settings.batchSize === p.batchSize;
            return (
              <button
                key={p.label}
                className={`preset ${active ? 'active' : ''}`}
                onClick={() => onChange({ wpm: p.wpm, batchSize: p.batchSize })}
              >
                <strong>{p.label}</strong>
                <span>{p.wpm} wpm · {p.batchSize}w</span>
              </button>
            );
          })}
        </div>

        <label className="field-label">
          Speed — {settings.wpm} words/min
        </label>
        <input
          type="range"
          min={100}
          max={900}
          step={25}
          value={settings.wpm}
          onChange={e => onChange({ wpm: Number(e.target.value) })}
        />

        <label className="field-label">
          Words per flash — {settings.batchSize}
        </label>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={settings.batchSize}
          onChange={e => onChange({ batchSize: Number(e.target.value) })}
        />

        <label className="field-label">
          Font size — {settings.fontSize}px
        </label>
        <input
          type="range"
          min={28}
          max={88}
          step={2}
          value={settings.fontSize}
          onChange={e => onChange({ fontSize: Number(e.target.value) })}
        />

        <label className="field-label">Reading aid</label>
        <div className="segmented">
          {HIGHLIGHTS.map(h => (
            <button
              key={h.value}
              className={settings.highlightMode === h.value ? 'active' : ''}
              onClick={() => onChange({ highlightMode: h.value })}
            >
              {h.label}
            </button>
          ))}
        </div>

        <Toggle
          label="Center words on focus point (eye-pin)"
          checked={settings.orpCenter}
          onChange={v => onChange({ orpCenter: v })}
        />
        <Toggle
          label="Pause on punctuation"
          checked={settings.pauseOnPunctuation}
          onChange={v => onChange({ pauseOnPunctuation: v })}
        />
        <Toggle
          label="Whoosh sound on fast rewind"
          checked={settings.soundEnabled}
          onChange={v => onChange({ soundEnabled: v })}
        />
        <Toggle
          label="Dark theme"
          checked={settings.darkMode}
          onChange={v => onChange({ darkMode: v })}
        />

        <p className="gesture-hint">
          Tip: drag the text left → right to rewind. Flick fast right → left to jump
          back to where you left off.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={`switch ${checked ? 'on' : ''}`} />
    </label>
  );
}
