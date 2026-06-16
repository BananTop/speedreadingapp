import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import type { BookData, ReaderSettings } from './types';
import { FileImport } from './components/FileImport';
import { WordDisplay } from './components/WordDisplay';
import { Controls } from './components/Controls';
import { SettingsPanel } from './components/SettingsPanel';
import { useReader } from './hooks/useReader';
import { useSwipeScrub } from './hooks/useSwipeScrub';
import { useWakeLock } from './hooks/useWakeLock';
import {
  loadSettings,
  saveSettings,
  loadBook,
  saveBook,
  loadPosition,
  clearBook,
} from './utils/storage';
import { playWhoosh } from './utils/sound';

export default function App() {
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [book, setBook] = useState<BookData | null>(null);
  const [start, setStart] = useState({ index: 0, maxIndex: 0 });
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Restore a previously imported book + position on first load.
  useEffect(() => {
    (async () => {
      const [savedBook, pos] = await Promise.all([loadBook(), loadPosition()]);
      if (savedBook && savedBook.words.length > 0) {
        setBook(savedBook);
        if (pos) setStart({ index: pos.index, maxIndex: pos.maxIndex });
      }
      setReady(true);
    })();
  }, []);

  // Apply theme to the document.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
  }, [settings.darkMode]);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const onLoaded = useCallback((b: BookData) => {
    setBook(b);
    setStart({ index: 0, maxIndex: 0 });
    void saveBook(b);
  }, []);

  const onChangeBook = useCallback(() => {
    setBook(null);
    void clearBook();
  }, []);

  if (!ready) return <div className="app loading">…</div>;
  if (!book)
    return (
      <div className="app">
        <FileImport onLoaded={onLoaded} />
      </div>
    );

  return (
    <Reader
      book={book}
      settings={settings}
      start={start}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      updateSettings={updateSettings}
      onChangeBook={onChangeBook}
    />
  );
}

interface ReaderProps {
  book: BookData;
  settings: ReaderSettings;
  start: { index: number; maxIndex: number };
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  updateSettings: (patch: Partial<ReaderSettings>) => void;
  onChangeBook: () => void;
}

function Reader({
  book,
  settings,
  start,
  showSettings,
  setShowSettings,
  updateSettings,
  onChangeBook,
}: ReaderProps) {
  const reader = useReader(book.words, settings, start);
  useWakeLock(reader.isPlaying);

  const onWoosh = useCallback(() => {
    reader.jumpToMax();
    if (settings.soundEnabled) playWhoosh();
  }, [reader, settings.soundEnabled]);

  const swipe = useSwipeScrub({
    onStart: reader.pause,
    onSettle: deltaBatches => {
      // positive deltaBatches = rewind (go back to a lower index)
      reader.seek(reader.index - deltaBatches * Math.max(1, settings.batchSize));
    },
    onWoosh,
  });

  // Keyboard support for desktop testing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (e.code === 'Space') {
        e.preventDefault();
        reader.toggle();
      } else if (e.code === 'ArrowLeft') reader.prevBatch();
      else if (e.code === 'ArrowRight') reader.nextBatch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reader, showSettings]);

  const title = useMemo(
    () => (book.title.length > 28 ? book.title.slice(0, 27) + '…' : book.title),
    [book.title]
  );

  return (
    <div className="app reader-app">
      <header className="topbar">
        <button className="icon-btn" onClick={onChangeBook} aria-label="Change book">📚</button>
        <span className="book-title">{title}</span>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
      </header>

      <main className="reader-main">
        <WordDisplay
          batch={reader.batch}
          words={book.words}
          index={reader.index}
          batchSize={Math.max(1, settings.batchSize)}
          settings={settings}
          swipe={swipe}
          onTap={reader.toggle}
        />
      </main>

      <Controls
        index={reader.index}
        maxIndex={reader.maxIndex}
        total={reader.total}
        isPlaying={reader.isPlaying}
        wpm={settings.wpm}
        onToggle={reader.toggle}
        onRestart={reader.restart}
        onPrev={reader.prevBatch}
        onNext={reader.nextBatch}
        onSeek={reader.seek}
        onJumpToMax={reader.jumpToMax}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
