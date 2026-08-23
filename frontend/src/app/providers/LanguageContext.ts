import { createContext, useContext } from "react";
import type { SupportedLanguage } from "../../i18n/types";

export interface LanguageContextValue {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
  isSyncingLanguage: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
