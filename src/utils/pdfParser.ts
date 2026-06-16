import * as pdfjsLib from 'pdfjs-dist';

// Reference the worker as a static file in public/ rather than via
// new URL(..., import.meta.url): the latter is unreliable in Vite production
// builds (asset hashing breaks the path) and on iOS Safari. BASE_URL keeps it
// working under the GitHub Pages sub-path.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export class PDFPasswordError extends Error {
  constructor() {
    super('This PDF is password-protected. Remove the password and try again.');
    this.name = 'PDFPasswordError';
  }
}

export class PDFNoTextError extends Error {
  constructor() {
    super('No readable text found. This PDF may contain only scanned images.');
    this.name = 'PDFNoTextError';
  }
}

export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      // Disable features that aren't needed for text extraction and that
      // can introduce extra failure modes on mobile browsers.
      useSystemFonts: true,
      disableRange: true,
      disableStream: true,
    }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // pdfjs throws PasswordException for encrypted PDFs.
    if (/password/i.test(msg) || /PasswordException/i.test(msg)) {
      throw new PDFPasswordError();
    }
    throw err;
  }

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // Use the explicit reader API (getReader + read loop) instead of
    // getTextContent(), which internally uses "for await...of" over a
    // ReadableStream.  The explicit-reader approach is more broadly
    // compatible and avoids a failure mode seen on some iOS versions where
    // ReadableStream async-iteration is unreliable.
    const stream = page.streamTextContent({ includeMarkedContent: false });
    const reader = stream.getReader();
    const strs: string[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const item of (value as { items: Array<{ str?: string }> }).items) {
          if (item.str) strs.push(item.str);
        }
      }
    } finally {
      reader.releaseLock();
    }
    pageTexts.push(strs.join(' '));
  }

  const text = pageTexts.join('\n');
  if (!text.trim()) throw new PDFNoTextError();
  return text;
}
