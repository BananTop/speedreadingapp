import { useCallback, useRef, useState } from 'react';
import type { BookData } from '../types';
import { processText } from '../utils/textProcessor';

interface Props {
  onLoaded: (book: BookData) => void;
}

function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong. Please try a different file.';

  const msg = err.message;
  const name = err.name;

  if (name === 'PDFPasswordError') return msg;
  if (name === 'PDFNoTextError') return msg;

  // pdfjs error messages
  if (/password/i.test(msg)) return 'This PDF is password-protected. Remove the password and try again.';
  if (/invalid pdf/i.test(msg) || /not a pdf/i.test(msg)) return 'This file doesn\'t appear to be a valid PDF.';
  if (/worker/i.test(msg)) return 'PDF reader failed to start. Try closing other tabs and importing again.';

  // EPUB errors
  if (/container\.xml/i.test(msg) || /opf/i.test(msg)) return 'This EPUB file appears to be corrupted or in an unsupported format.';

  // Generic network/load errors
  if (/fetch/i.test(msg) || /network/i.test(msg)) return 'Could not load the file reader. Check your internet connection and try again.';

  // File is too large or caused a memory error
  if (/out of memory/i.test(msg) || /memory/i.test(msg)) return 'The file is too large to process on this device.';

  // Show the raw message so the user can report it, but keep it concise.
  return `Failed to read file: ${msg}`;
}

export function FileImport({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        // iOS Safari is unreliable with the `accept` MIME filter, so dispatch
        // on the lowercased file extension instead of the reported type.
        const name = file.name.toLowerCase();
        let raw: string;
        if (name.endsWith('.pdf')) {
          const { parsePDF } = await import('../utils/pdfParser');
          raw = await parsePDF(file);
        } else if (name.endsWith('.epub')) {
          const { parseEPUB } = await import('../utils/epubParser');
          raw = await parseEPUB(file);
        } else {
          throw new Error('Unsupported file type. Please choose a .pdf or .epub file.');
        }

        const words = processText(raw);
        if (words.length === 0) {
          throw new Error('No readable text found in this file.');
        }

        const title = file.name.replace(/\.(pdf|epub)$/i, '');
        onLoaded({ title, words });
      } catch (e) {
        setError(classifyError(e));
      } finally {
        setLoading(false);
      }
    },
    [onLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="import-screen">
      <h1 className="brand">SpeedRead</h1>
      <p className="tagline">Read faster, one line at a time.</p>

      <button
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        disabled={loading}
      >
        {loading ? (
          <span className="spinner-text">Reading your book…</span>
        ) : (
          <>
            <span className="dropzone-icon">📖</span>
            <span className="dropzone-title">Choose a PDF or EPUB</span>
            <span className="dropzone-sub">Tap to browse, or drop a file here</span>
          </>
        )}
      </button>

      {error && (
        <div className="error-block">
          <p className="error">{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <p className="import-hint">
        Your book stays on your device — nothing is uploaded.
      </p>
    </div>
  );
}
