import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import i18n from "../../i18n";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "../../i18n/types";
import { hasTokens } from "../../services/api/token";
import {
  getUserSettings,
  patchUserSettings,
} from "../../services/settings.service";
import { LanguageContext } from "./LanguageContext";

function getInitialLang(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "vi" || stored === "en") {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLang);
  const [isSyncingLanguage, setIsSyncingLanguage] = useState(false);

  // Sync language from backend when authenticated
  useEffect(() => {
    let ignore = false;

    if (hasTokens()) {
      getUserSettings()
        .then((settings) => {
          if (ignore) return;
          if (settings?.language && (settings.language === "vi" || settings.language === "en")) {
            const backendLang = settings.language as SupportedLanguage;
            setLanguageState((curr) => {
              if (curr !== backendLang) {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, backendLang);
                i18n.changeLanguage(backendLang);
                return backendLang;
              }
              return curr;
            });
          }
        })
        .catch((err) => {
          console.warn("[i18n] Could not sync language from backend:", err);
        });
    }

    return () => {
      ignore = true;
    };
  }, []);

  const changeLanguage = useCallback(async (newLang: SupportedLanguage) => {
    // 1. Immediate optimistic UI update & localStorage
    setLanguageState(newLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    await i18n.changeLanguage(newLang);

    // 2. Persist to backend if authenticated
    if (hasTokens()) {
      try {
        setIsSyncingLanguage(true);
        await patchUserSettings({ language: newLang });
        console.log("[i18n] Language synced with backend:", newLang);
      } catch (error) {
        console.error("[i18n] Failed to persist language to backend:", error);
      } finally {
        setIsSyncingLanguage(false);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      changeLanguage,
      isSyncingLanguage,
    }),
    [language, changeLanguage, isSyncingLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
