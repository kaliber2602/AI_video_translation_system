import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../app/providers/LanguageContext";

export default function HomeNavbar() {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLanguageToggle = () => {
    const nextLang = language === "en" ? "vi" : "en";
    changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-50 liquid-glass transition-colors duration-200">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
            >
              <circle cx="7" cy="16" r="3" fill="currentColor" />
              <circle cx="24" cy="8" r="3" fill="currentColor" />
              <circle cx="24" cy="24" r="3" fill="currentColor" />
              <path d="M9.5 15L21.5 9" stroke="currentColor" strokeWidth="2" />
              <path d="M9.5 17L21.5 23" stroke="currentColor" strokeWidth="2" />
            </svg>
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
        <nav className="hidden items-center gap-7 lg:flex">
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
            href="#how-it-works"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:howItWorks")}
          </a>

          <a
            href="#semantic-search"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:semanticSearch")}
          </a>

          <a
            href="#pricing"
            className="py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
          >
            {t("navigation:pricing")}
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Language Switcher */}
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            title={`Switch to ${language === "en" ? "Tiếng Việt" : "English"}`}
          >
            <Globe size={15} className="text-[var(--color-primary)]" />
            <span>{language.toUpperCase()}</span>
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
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-[0_7px_20px_rgba(21,194,168,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-[0_10px_25px_rgba(21,194,168,0.35)]"
          >
            <span>{t("navigation:register")}</span>
            <span className="text-xs">→</span>
          </button>
        </div>
      </div>
    </header>
  );
}