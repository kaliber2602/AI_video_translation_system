import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "./types";

// English resources
import enCommon from "./locales/en/common.json";
import enNavigation from "./locales/en/navigation.json";
import enAuth from "./locales/en/auth.json";
import enHome from "./locales/en/home.json";
import enWorkspace from "./locales/en/workspace.json";
import enProject from "./locales/en/project.json";
import enPipeline from "./locales/en/pipeline.json";
import enSettings from "./locales/en/settings.json";
import enPricing from "./locales/en/pricing.json";
import enAdmin from "./locales/en/admin.json";
import enNotifications from "./locales/en/notifications.json";

// Vietnamese resources
import viCommon from "./locales/vi/common.json";
import viNavigation from "./locales/vi/navigation.json";
import viAuth from "./locales/vi/auth.json";
import viHome from "./locales/vi/home.json";
import viWorkspace from "./locales/vi/workspace.json";
import viProject from "./locales/vi/project.json";
import viPipeline from "./locales/vi/pipeline.json";
import viSettings from "./locales/vi/settings.json";
import viPricing from "./locales/vi/pricing.json";
import viAdmin from "./locales/vi/admin.json";
import viNotifications from "./locales/vi/notifications.json";

export const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    home: enHome,
    workspace: enWorkspace,
    project: enProject,
    pipeline: enPipeline,
    settings: enSettings,
    pricing: enPricing,
    admin: enAdmin,
    notifications: enNotifications,
  },
  vi: {
    common: viCommon,
    navigation: viNavigation,
    auth: viAuth,
    home: viHome,
    workspace: viWorkspace,
    project: viProject,
    pipeline: viPipeline,
    settings: viSettings,
    pricing: viPricing,
    admin: viAdmin,
    notifications: viNotifications,
  },
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
