import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

// Suppress known non-critical errors that Vite runtime-error plugin incorrectly treats as fatal
const SUPPRESSED_ERRORS = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
];

window.addEventListener('error', (evt) => {
  if (SUPPRESSED_ERRORS.includes(evt.message)) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    return;
  }
  const target = evt.target as any;
  console.error('[GLOBAL ERROR]', {
    error: evt.error,
    type: typeof evt.error,
    isError: evt.error instanceof Error,
    stack: evt.error?.stack,
    message: evt.message,
    filename: evt.filename,
    lineno: evt.lineno,
    colno: evt.colno,
    targetTag: target?.tagName,
    targetSrc: target?.src,
    targetHref: target?.href,
  });
});
window.addEventListener('unhandledrejection', (evt) => {
  console.error('[GLOBAL UNHANDLED REJECTION]', {
    reason: evt.reason,
    type: typeof evt.reason,
    isError: evt.reason instanceof Error,
    stack: evt.reason?.stack,
  });
});

// Register Service Worker for caching
(() => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="dark" 
    enableSystem
    themes={["light", "dark", "purple", "emerald"]}
  >
    <App />
  </ThemeProvider>
);
