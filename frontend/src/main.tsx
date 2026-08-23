import React from "react";
import ReactDOM from "react-dom/client";

import "./i18n";
import App from "./App";
import { LanguageProvider } from "./app/providers/LanguageProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);