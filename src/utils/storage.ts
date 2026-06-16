import type { ReaderSettings, BookData } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const SETTINGS_KEY = 'speedread.settings';
const DB_NAME = 'speedread';
const DB_VERSION = 1;
const STORE = 'kv';
const BOOK_KEY = 'currentBook';
const POSITION_KEY = 'position'; // { index, maxIndex }

// ---- Settings (small, fits localStorage) ----

export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / private-mode errors
  }
}

// ---- Book + position (potentially large, use IndexedDB) ----

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export function saveBook(book: BookData): Promise<void> {
  return idbSet(BOOK_KEY, book);
}

export function loadBook(): Promise<BookData | null> {
  return idbGet<BookData>(BOOK_KEY);
}

export interface SavedPosition {
  index: number;
  maxIndex: number;
}

export function savePosition(pos: SavedPosition): Promise<void> {
  return idbSet(POSITION_KEY, pos);
}

export function loadPosition(): Promise<SavedPosition | null> {
  return idbGet<SavedPosition>(POSITION_KEY);
}

export async function clearBook(): Promise<void> {
  await idbSet(BOOK_KEY, null);
  await idbSet(POSITION_KEY, null);
}
