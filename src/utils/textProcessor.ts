// Returns index of the Optimal Recognition Point character within a word
export function getORPIndex(word: string): number {
  const len = word.replace(/[^a-zA-Z0-9]/g, '').length || word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

// Returns how many leading chars to bold for Bionic Reading
export function getBionicBoldCount(word: string): number {
  const clean = word.replace(/[^a-zA-Z]/g, '');
  if (clean.length <= 1) return 1;
  if (clean.length <= 3) return 1;
  if (clean.length <= 7) return Math.ceil(clean.length * 0.4);
  return Math.ceil(clean.length * 0.35);
}

// Detect if a word ends with sentence-ending or clause-ending punctuation
export function endsWithPause(word: string): 'long' | 'short' | null {
  if (/[.!?…]+$/.test(word)) return 'long';
  if (/[,;:—]+$/.test(word)) return 'short';
  return null;
}

export function processText(raw: string): string[] {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length > 0);
}
