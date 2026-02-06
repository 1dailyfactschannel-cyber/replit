import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";
import { setupGlobalErrorMonitoring } from "./debug-hooks";

// Инициализация глобального мониторинга ошибок
setupGlobalErrorMonitoring();

// Глобальный обработчик ошибок React
window.addEventListener('error', (event) => {
  console.error('=== GLOBAL ERROR CAUGHT ===');
  console.error('Error message:', event.error?.message);
  console.error('Error stack:', event.error?.stack);
  console.error('Filename:', event.filename);
  console.error('Line number:', event.lineno);
  console.error('Column number:', event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Reason:', event.reason);
  console.error('Promise:', event.promise);
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
