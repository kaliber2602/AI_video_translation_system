import { Check } from "lucide-react";
import { THEME_OPTIONS, type Theme } from "../../config/theme";

export interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeSelect: (theme: Theme) => void;
}

export default function ThemeSelector({
  currentTheme,
  onThemeSelect,
}: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const isSelected =
            currentTheme === option.value ||
            (option.value === "default_theme" && currentTheme === "light") ||
            (option.value === "dark_rose" && currentTheme === "dark");

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onThemeSelect(option.value)}
              className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/40 shadow-sm ring-2 ring-[var(--color-primary)]/20"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {/* Header: Title and Active Badge */}
              <div className="flex w-full items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-[var(--color-text-primary)]">
                      {option.label}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">
                    {option.description}
                  </p>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)] group-hover:border-[var(--color-primary)]"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>

              {/* Color Swatch Preview Bar */}
              <div className="mt-3.5 flex items-center justify-between rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-2">
                <div className="flex items-center gap-1.5">
                  {/* Primary dot */}
                  <span
                    className="h-4 w-4 rounded-full shadow-xs ring-1 ring-black/10"
                    style={{ backgroundColor: option.colors.primary }}
                    title="Primary"
                  />
                  {/* Secondary dot */}
                  <span
                    className="h-4 w-4 rounded-full shadow-xs ring-1 ring-black/10"
                    style={{ backgroundColor: option.colors.secondary }}
                    title="Secondary"
                  />
                  {/* Accent dot if available */}
                  {option.colors.accent && (
                    <span
                      className="h-4 w-4 rounded-full shadow-xs ring-1 ring-black/10"
                      style={{ backgroundColor: option.colors.accent }}
                      title="Accent"
                    />
                  )}
                </div>

                {/* Mode Tag */}
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                  style={{
                    backgroundColor: option.colors.background,
                    color: option.mode === "dark" ? "#CBD5E1" : "#475569",
                    border: `1px solid ${
                      option.mode === "dark" ? "#334155" : "#E2E8F0"
                    }`,
                  }}
                >
                  {option.mode}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
