export type Theme = "light" | "dark" | "system";

export const DEFAULT_THEME: Theme = "system";

export const THEME_STORAGE_KEY = "vidnova-theme";

export const THEME_OPTIONS = [
  {
    value: "light" as const,
    label: "Light",
  },
  {
    value: "dark" as const,
    label: "Dark",
  },
  {
    value: "system" as const,
    label: "System",
  },
];