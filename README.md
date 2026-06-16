# SpeedRead

A speed-reading web app (PWA) that imports a **PDF or EPUB** and flashes it one line
at a time using RSVP (Rapid Serial Visual Presentation), so your eyes stay fixed on a
single point. Built to run on an iPhone via Safari → **Add to Home Screen**.

Everything runs in your browser — your books are never uploaded.

## Features

- **Import PDF or EPUB** — parsed entirely on-device.
- **Adjustable difficulty**
  - **Speed**: 100–900 words per minute, with a gentle 12-second ramp-up.
  - **Words per flash**: 1–5 words shown at a time.
  - One-tap presets: Beginner → Intermediate → Advanced → Expert.
- **Reading aids**
  - **Focus dot (ORP)** — the Optimal Recognition Point letter of each word is coloured,
    marking where your eye should land.
  - **Bionic** — bolds the leading letters of each word to guide your eye.
  - **Eye-pin centering** — shifts each word so its focus letter sits on the exact
    centre line every flash, so your eyes never move.
- **Natural pacing** — automatic extra pause on sentence- and clause-ending punctuation.
- **Rewind gestures**
  - Drag the text **left → right** to scrub backward through words, carousel-style.
  - Flick fast **right → left** to "woosh" forward to the furthest word you'd reached
    (or tap the ⏭ catch-up button). Optional whoosh sound.
- **Resume** where you left off, with settings remembered.
- **Offline** — once loaded, the app and your current book work without a connection.
- **Keeps the screen awake** while reading (iOS 16.4+).

## Run locally

```bash
npm install
npm run dev      # development server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

Icons can be regenerated with `npm run icons`.

## Deploy to GitHub Pages (auto)

This repo includes `.github/workflows/deploy.yml`, which builds and deploys on every
push to `main` or `claude/speed-reading-app-jvf04f`.

**One-time setup:** in the GitHub repo, go to **Settings → Pages → Build and deployment**
and set **Source** to **GitHub Actions**.

After the workflow runs, the app is live at:

> **https://banantop.github.io/speedreadingapp/**

The Vite `base` is set to `/speedreadingapp/` to match this path. If you rename the
repo, update `base` in `vite.config.ts`, plus `start_url`/`scope` in
`public/manifest.webmanifest`.

## Install on your iPhone

1. Open the URL above in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. Launch it from the home screen — it runs full-screen like a native app, works
   offline, and keeps the screen awake while you read.

## How it's built

- **Vite + React + TypeScript**, no backend.
- PDF parsing via `pdfjs-dist` (worker served as a static file from `public/`),
  EPUB via `jszip` (spine-ordered text extraction). Both are lazy-loaded so the app
  starts fast.
- Settings persist in `localStorage`; the imported book + reading position persist in
  `IndexedDB`.

## Limitations

- No chapter/table-of-contents navigation — the book is flattened to a word stream.
- DRM-protected EPUBs and image-only/scanned PDFs have no extractable text.
- Reading position is stored per-device; there's no cloud sync.
