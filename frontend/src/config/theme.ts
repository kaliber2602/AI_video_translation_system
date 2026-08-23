export type Theme =
  | "default_theme"
  | "violet_light"
  | "indigo_pink"
  | "dark_rose"
  | "dark_lime"
  | "system"
  | "light"
  | "dark";

export interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  mode: "light" | "dark" | "system";
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    accent?: string;
  };
}

export const DEFAULT_THEME: Theme = "default_theme";

export const THEME_STORAGE_KEY = "vidnova-theme";

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "default_theme",
    label: "Default Mint (Light)",
    description: "Classic VidNova fresh mint and teal interface",
    mode: "light",
    colors: {
      primary: "#15C2A8",
      secondary: "#4C94E8",
      background: "#F7FBFA",
      surface: "#FFFFFF",
      accent: "#16BFA7",
    },
  },
  {
    value: "violet_light",
    label: "Modern Violet (Light)",
    description: "Vibrant violet & blue accents for creative focus",
    mode: "light",
    colors: {
      primary: "#8B5CF6",
      secondary: "#3B82F6",
      background: "#FFFFFF",
      surface: "#F3F4FA",
      accent: "#3B82F6",
    },
  },
  {
    value: "indigo_pink",
    label: "Neon Indigo (Light)",
    description: "Deep indigo with vivid magenta pink highlight",
    mode: "light",
    colors: {
      primary: "#7C3AED",
      secondary: "#4F46E5",
      background: "#FFFFFF",
      surface: "#F8F9FE",
      accent: "#EC18A6",
    },
  },
  {
    value: "dark_rose",
    label: "Midnight Crimson (Dark)",
    description: "Deep dark canvas with electric rose red highlights",
    mode: "dark",
    colors: {
      primary: "#E11D48",
      secondary: "#EC4899",
      background: "#0A0A0E",
      surface: "#14141C",
      accent: "#FB7185",
    },
  },
  {
    value: "dark_lime",
    label: "Cyber Lime (Dark)",
    description: "Dark olive with energetic lime green & amber",
    mode: "dark",
    colors: {
      primary: "#84CC16",
      secondary: "#F59E0B",
      background: "#0A0D08",
      surface: "#131710",
      accent: "#D97706",
    },
  },
  {
    value: "system",
    label: "System Preference",
    description: "Automatically matches your device OS theme",
    mode: "system",
    colors: {
      primary: "#15C2A8",
      secondary: "#8B5CF6",
      background: "#E2E8F0",
      surface: "#FFFFFF",
    },
  },
];