import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
} from "../../config/theme";
import { hasTokens } from "../../services/api/token";
import {
  getUserSettings,
  patchUserSettings,
} from "../../services/settings.service";
import { ThemeContext } from "./ThemeContext";

const VALID_THEMES: Theme[] = [
  "default_theme",
  "violet_light",
  "indigo_pink",
  "dark_rose",
  "dark_lime",
  "system",
  "light",
  "dark",
];

function getInitialTheme(): Theme {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme && VALID_THEMES.includes(storedTheme as Theme)) {
    return storedTheme as Theme;
  }

  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apply theme to HTML attribute
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  // Sync theme from backend on startup or when tokens exist
  const refreshTheme = useCallback(async () => {
    if (!hasTokens()) {
      return;
    }

    try {
      setIsSyncing(true);
      const settings = await getUserSettings();

      if (settings?.theme && VALID_THEMES.includes(settings.theme as Theme)) {
        const backendTheme = settings.theme as Theme;
        setThemeState((current) => {
          if (current !== backendTheme) {
            localStorage.setItem(THEME_STORAGE_KEY, backendTheme);
            return backendTheme;
          }
          return current;
        });
      }
    } catch (error) {
      console.warn("[THEME] Could not sync theme from backend:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    if (hasTokens()) {
      getUserSettings()
        .then((settings) => {
          if (ignore) return;
          if (settings?.theme && VALID_THEMES.includes(settings.theme as Theme)) {
            const backendTheme = settings.theme as Theme;
            setThemeState((current) => {
              if (current !== backendTheme) {
                localStorage.setItem(THEME_STORAGE_KEY, backendTheme);
                return backendTheme;
              }
              return current;
            });
          }
        })
        .catch((err) => {
          console.warn("[THEME] Initial sync failed:", err);
        });
    }

    return () => {
      ignore = true;
    };
  }, []);

  // Set theme & persist locally and to backend
  const setTheme = useCallback(
    async (newTheme: Theme) => {
      // 1. Immediate optimistic UI update & localStorage
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);

      // 2. Sync with backend if authenticated
      if (hasTokens()) {
        try {
          setIsSyncing(true);
          await patchUserSettings({ theme: newTheme });
          console.log("[THEME] Theme synced with backend:", newTheme);
        } catch (error) {
          console.error("[THEME] Failed to persist theme to backend:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      refreshTheme,
      isSyncing,
    }),
    [theme, setTheme, refreshTheme, isSyncing]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}