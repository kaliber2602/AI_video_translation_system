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
import {
  AUTH_CHANGE_EVENT,
  hasTokens,
} from "../../services/api/token";
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

  const PUBLIC_AUTH_PATHS = [
    "/",
    "/pricing",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-otp",
  ];

  // Helper to apply theme to DOM based on active route
  const updateThemeForRoute = useCallback((targetTheme: Theme = theme) => {
    const root = document.documentElement;
    const pathname = window.location.pathname;
    const isPublicAuthPage = PUBLIC_AUTH_PATHS.some(
      (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
    );
    const effectiveTheme = isPublicAuthPage ? DEFAULT_THEME : targetTheme;
    root.setAttribute("data-theme", effectiveTheme);
  }, [theme]);

  // Synchronize theme with backend preferences
  const refreshTheme = useCallback(async () => {
    if (!hasTokens()) {
      return;
    }

    try {
      setIsSyncing(true);
      const settings = await getUserSettings();

      if (settings?.theme && VALID_THEMES.includes(settings.theme as Theme)) {
        const backendTheme = settings.theme as Theme;
        setThemeState(backendTheme);
        localStorage.setItem(THEME_STORAGE_KEY, backendTheme);
        updateThemeForRoute(backendTheme);
      }
    } catch (error) {
      console.warn("[THEME] Could not sync theme from backend:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [updateThemeForRoute]);

  // Apply theme to HTML attribute whenever state changes or route changes
  useEffect(() => {
    updateThemeForRoute(theme);

    const handleRouteChange = () => {
      updateThemeForRoute(theme);
    };

    window.addEventListener("popstate", handleRouteChange);

    // Observer for DOM/URL changes triggered by SPA client-side routing
    const intervalId = window.setInterval(handleRouteChange, 300);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      window.clearInterval(intervalId);
    };
  }, [theme, updateThemeForRoute]);

  // Initial sync on mount if tokens exist
  useEffect(() => {
    if (hasTokens()) {
      refreshTheme();
    }
  }, [refreshTheme]);

  // Listen for login/logout auth state changes
  useEffect(() => {
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isAuthenticated: boolean }>;
      if (customEvent.detail?.isAuthenticated) {
        // User logged in: immediately fetch their saved preferences from DB
        refreshTheme();
      } else {
        // User logged out: restore default theme
        setThemeState(DEFAULT_THEME);
        localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
        updateThemeForRoute(DEFAULT_THEME);
      }
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, [refreshTheme, updateThemeForRoute]);

  // Set theme & persist locally and to backend
  const setTheme = useCallback(
    async (newTheme: Theme) => {
      // 1. Immediate optimistic UI update & localStorage
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      updateThemeForRoute(newTheme);

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
    [updateThemeForRoute]
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
