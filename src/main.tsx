// Polyfills for APIs that pdfjs-dist v6 requires but were only added to
// iOS Safari in 17.4. These must run before any pdfjs module is imported.

// AbortSignal.any() — added Safari 17.4; pdfjs calls it in combinedSignal().
if (typeof AbortSignal !== 'undefined' && !AbortSignal.any) {
  (AbortSignal as typeof AbortSignal & { any: (signals: AbortSignal[]) => AbortSignal }).any =
    function any(signals: AbortSignal[]): AbortSignal {
      const ac = new AbortController();
      for (const signal of signals) {
        if (signal.aborted) {
          ac.abort(signal.reason);
          return ac.signal;
        }
        signal.addEventListener(
          'abort',
          () => { if (!ac.signal.aborted) ac.abort(signal.reason); },
          { once: true }
        );
      }
      return ac.signal;
    };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker for offline use (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* offline support is best-effort */
      })
  })
}
