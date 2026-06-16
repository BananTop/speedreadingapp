// Generates the app icons as PNGs with no external dependencies.
// Design: dark background, three "reading lines" with a red focus dot on the
// centre line (evokes one-line RSVP reading + the ORP focus point).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const BG = [15, 17, 21, 255]; // #0f1115
const LINE = [139, 147, 163, 255]; // muted
const ACCENT = [226, 58, 58, 255]; // ORP red
const BRAND = [91, 140, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, px) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    px.subarray(y * stride, (y + 1) * stride).copy(raw, y * (stride + 1) + 1);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
    px[i + 3] = c[3];
  };
  // background
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);

  // three lines
  const lineH = Math.round(size * 0.07);
  const gap = Math.round(size * 0.13);
  const left = Math.round(size * 0.22);
  const right = Math.round(size * 0.78);
  const cy = size / 2;
  const ys = [cy - gap - lineH / 2, cy - lineH / 2, cy + gap - lineH / 2];

  ys.forEach((y0, idx) => {
    const isMid = idx === 1;
    const w = isMid ? right : Math.round(left + (right - left) * 0.7);
    for (let y = 0; y < lineH; y++) {
      for (let x = left; x < w; x++) {
        set(x, Math.round(y0) + y, isMid ? BRAND : LINE);
      }
    }
  });

  // ORP focus dot above the middle line
  const dotR = Math.round(size * 0.05);
  const dx = Math.round(size * 0.5);
  const dy = Math.round(cy - gap - lineH);
  for (let y = -dotR; y <= dotR; y++) {
    for (let x = -dotR; x <= dotR; x++) {
      if (x * x + y * y <= dotR * dotR) set(dx + x, dy + y, ACCENT);
    }
  }

  return encodePNG(size, px);
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192));
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512));
writeFileSync(join(outDir, 'apple-touch-icon.png'), makeIcon(180));
console.log('Icons written to public/');
