import { createContext, useContext } from "react";
import type { Theme } from "../../config/theme";

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  refreshTheme: () => Promise<void>;
  isSyncing: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
