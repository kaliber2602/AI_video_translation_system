export type SupportedLanguage = "en" | "vi";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇺🇸",
  },
  {
    code: "vi",
    label: "Vietnamese",
    nativeLabel: "Tiếng Việt",
    flag: "🇻🇳",
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "vidnova_language";
