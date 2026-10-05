import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "./types";

import enResources from "./locales/en";
import viResources from "./locales/vi";

export const resources = {
  en: enResources,
  vi: viResources,
} as const;

export const defaultNS = "common";

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "vi" || stored === "en") {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS,
    ns: [
      "common",
      "navigation",
      "auth",
      "home",
      "workspace",
      "project",
      "pipeline",
      "settings",
      "pricing",
      "admin",
      "notifications",
    ],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
