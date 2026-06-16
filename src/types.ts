export type HighlightMode = 'none' | 'bionic' | 'orp';

export interface ReaderSettings {
  wpm: number;
  batchSize: number;
  highlightMode: HighlightMode;
  orpCenter: boolean;
  pauseOnPunctuation: boolean;
  fontSize: number;
  darkMode: boolean;
  soundEnabled: boolean;
}

export interface BookData {
  title: string;
  words: string[];
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  batchSize: 1,
  highlightMode: 'orp',
  orpCenter: true,
  pauseOnPunctuation: true,
  fontSize: 48,
  darkMode: true,
  soundEnabled: false,
};
