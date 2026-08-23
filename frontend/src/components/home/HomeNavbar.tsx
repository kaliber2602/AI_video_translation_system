import {
  Globe,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../app/providers/LanguageContext";

export default function HomeNavbar() {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, changeLanguage } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleThemeToggle = () => {
    setDarkMode((prev) => !prev);
  };

  const handleLanguageToggle = () => {
    const nextLang = language === "en" ? "vi" : "en";
    changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-[#7657F6]" />
            <div className="absolute left-1 top-4 h-2 w-2 rounded-full bg-[#7657F6]" />
            <div className="absolute left-0 top-7 h-2 w-2 rounded-full bg-[#7657F6]" />

            <div className="absolute left-3 top-2 h-[2px] w-7 rotate-[-20deg] bg-[#7657F6]" />
            <div className="absolute left-3 top-5 h-[2px] w-7 bg-[#7657F6]" />
            <div className="absolute left-3 top-7 h-[2px] w-7 rotate-[20deg] bg-[#7657F6]" />
          </div>

          <div className="leading-none">
            <div className="text-[18px] font-black tracking-[0.16em] text-[var(--color-text-primary)]">
              VIDNOVA
            </div>

            <div className="mt-1 text-[8px] font-bold tracking-[0.4em] text-[var(--color-primary)]">
              SINCE 2026
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          <a
            href="#home"
            className="relative py-2 text-sm font-semibold text-[var(--color-primary)]"
          >
            {t("navigation:home")}
            <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-[var(--color-primary)]" />
          </a>

          <a
            href="#features"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:features")}
          </a>

          <a
            href="#solutions"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:solutions")}
          </a>

          <a
            href="#pricing"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:pricing")}
          </a>

          <a
            href="#resources"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:resources")}
          </a>

          <a
            href="#about"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:about")}
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Language Switcher */}
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            title={`Switch to ${language === "en" ? "Tiếng Việt" : "English"}`}
          >
            <Globe size={15} className="text-[var(--color-primary)]" />
            <span>{language.toUpperCase()}</span>
          </button>

          <button
            onClick={handleThemeToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link
            to="/login"
            className="hidden h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:flex"
          >
            {t("navigation:login")}
          </Link>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-[0_7px_20px_rgba(24,195,170,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
          >
            {t("navigation:register")}
            <span>→</span>
          </button>
        </div>
      </div>
    </header>
  );
}