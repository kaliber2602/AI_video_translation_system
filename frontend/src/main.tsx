import React from "react";
import ReactDOM from "react-dom/client";

import "./i18n";
import App from "./App";
import { LanguageProvider } from "./app/providers/LanguageProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { initVeloxi } from "./lib/veloxi";
import "./index.css";

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