import * as pdfjsLib from 'pdfjs-dist';

// Reference the worker as a static file in public/ rather than via
// new URL(..., import.meta.url): the latter is unreliable in Vite production
// builds (asset hashing breaks the path) and on iOS Safari. BASE_URL keeps it
// working under the GitHub Pages sub-path.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str ?? '';
      })
      .join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n');
}
