import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

const THEME_STORAGE_KEY = "theme";
const THEMES = new Set(["light", "dark", "auto"]);
const DEFAULT_THEME = "auto";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type Theme = "light" | "dark" | "auto";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  setTheme: (nextTheme: Theme | ((currentTheme: Theme) => Theme)) => void;
  isAuto: boolean;
}

const isTheme = (value: unknown): value is Theme => THEMES.has(value as string);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch (error) {
    return DEFAULT_THEME;
  }
}

function persistTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {}

  document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(
    theme
  )}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function applyTheme(theme: Theme, resolvedTheme: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const isDark = resolvedTheme === "dark";
  root.classList.toggle("dark", isDark);
  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = theme;
  root.style.colorScheme = resolvedTheme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", isDark ? "#000000" : "#f8fafc");
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    getSystemTheme
  );
  const resolvedTheme: "light" | "dark" =
    theme === "auto" ? systemTheme : theme;

  useLayoutEffect(() => {
    applyTheme(theme, resolvedTheme);
    persistTheme(theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () =>
      setSystemTheme(media.matches ? "dark" : "light");

    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      setThemeState(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback(
    (nextTheme: Theme | ((currentTheme: Theme) => Theme)) => {
      setThemeState((currentTheme) => {
        const value =
          typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme;
        return isTheme(value) ? value : DEFAULT_THEME;
      });
    },
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      isAuto: theme === "auto",
    }),
    [theme, resolvedTheme, systemTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
