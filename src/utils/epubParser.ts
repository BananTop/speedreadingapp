import JSZip from 'jszip';

function extractTextFromHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, nav').forEach(el => el.remove());
  return (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function getAttr(el: Element, attr: string): string {
  return el.getAttribute(attr) ?? '';
}

function parseContainerXml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const rootfile = doc.querySelector('rootfile');
  return rootfile ? getAttr(rootfile, 'full-path') : 'OEBPS/content.opf';
}

function resolveDir(opfPath: string): string {
  const parts = opfPath.split('/');
  parts.pop();
  return parts.length ? parts.join('/') + '/' : '';
}

function parseOPF(xml: string, opfPath: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const dir = resolveDir(opfPath);

  // Build manifest id → href map
  const manifest: Record<string, string> = {};
  doc.querySelectorAll('manifest item').forEach(item => {
    const id = getAttr(item, 'id');
    const href = getAttr(item, 'href');
    const mediaType = getAttr(item, 'media-type');
    if (id && href && (mediaType.includes('html') || mediaType.includes('xhtml'))) {
      manifest[id] = dir + href;
    }
  });

  // Follow spine order
  const spineItems: string[] = [];
  doc.querySelectorAll('spine itemref').forEach(ref => {
    const idref = getAttr(ref, 'idref');
    if (manifest[idref]) spineItems.push(manifest[idref]);
  });

  return spineItems;
}

export async function parseEPUB(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const opfPath = parseContainerXml(containerXml);
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) throw new Error(`Invalid EPUB: missing OPF file at ${opfPath}`);

  const contentFiles = parseOPF(opfContent, opfPath);
  if (contentFiles.length === 0) throw new Error('EPUB has no readable content in spine');

  const chunks: string[] = [];
  for (const filePath of contentFiles) {
    const html = await zip.file(filePath)?.async('text');
    if (html) chunks.push(extractTextFromHTML(html));
  }

  return chunks.join('\n');
}
