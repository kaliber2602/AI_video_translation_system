import React from "react";
import ReactDOM from "react-dom/client";

import "./i18n";
import App from "./App";
import { LanguageProvider } from "./app/providers/LanguageProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { initVeloxi } from "./lib/veloxi";
import "./index.css";

// Handle Vite dynamic import / lazy chunk fetch errors (e.g., after deployment or rebuild)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[Vite] Dynamic import preload error, reloading for fresh assets...", event);
  window.location.reload();
});

window.addEventListener("error", (e) => {
  if (
    e.message?.includes("Failed to fetch dynamically imported module") ||
    e.message?.includes("Importing a module script failed") ||
    e.message?.includes("error loading dynamically imported module")
  ) {
    console.warn("[Vite] Dynamic module load error, reloading page for fresh assets...");
    window.location.reload();
  }
});

initVeloxi();

// Initialize saved system typography
const savedFont = localStorage.getItem("vidnova_system_font");
if (savedFont) {
  const fontStacks: Record<string, string> = {
    "Inter": '"Inter", ui-sans-serif, system-ui, sans-serif',
    "Be Vietnam Pro": '"Be Vietnam Pro", sans-serif',
    "Roboto": '"Roboto", sans-serif',
    "Open Sans": '"Open Sans", sans-serif',
    "Lexend": '"Lexend", sans-serif',
  };
  if (fontStacks[savedFont]) {
    document.documentElement.style.setProperty("--system-font-family", fontStacks[savedFont]);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
