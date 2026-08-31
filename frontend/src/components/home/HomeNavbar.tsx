import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../app/providers/LanguageContext";
import RippleDistortion from "../common/RippleDistortion";

export default function HomeNavbar() {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLanguageToggle = () => {
    const nextLang = language === "en" ? "vi" : "en";
    changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-50 w-full pt-3 sm:pt-4 pb-2 px-3 sm:px-6 transition-all duration-300">
      <div className="mx-auto max-w-[1320px] h-[58px] sm:h-[64px] relative rounded-full overflow-hidden border border-[var(--color-border)]/50 bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.03),0_4px_24px_color-mix(in_srgb,var(--color-primary)_12%,transparent)] backdrop-blur-lg backdrop-saturate-150 transition-all">
        
        {/* ======================================================== */}
        {/* RIPPLE DISTORTION BACKGROUND EFFECT (React Bits) */}
        {/* ======================================================== */}
        <RippleDistortion
          className="absolute inset-0 w-full h-full"
          brushSize={140}
          strength={0.22}
          swirl={0.75}
          rings={3}
          spread={4}
          fade={2.2}
          spacing={12}
          dispersion={0.08}
          glint={0.35}
          tint="#15c2a8"
          tintAmount={0.12}
          highlightColor="#ffffff"
          grayscale={false}
          trigger="hover"
          alpha={0.55}
          quality="high"
          enabled={true}
        />

        {/* ======================================================== */}
        {/* THEME-REACTIVE PURE DIFFUSED GLOW AURA (Wrapping up to 50% of both caps) */}
        {/* ======================================================== */}
        {/* 1. Outer soft diffused aura wrapping around bottom curve and climbing to half-capsule */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-[5px] border-[var(--color-primary)] opacity-25 blur-[6px] z-10"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 20%, black 70%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 20%, black 70%)",
          }}
        />
        {/* 2. Inner soft mist glow along the curve (strictly blurred, NO solid line) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-[var(--color-primary)] opacity-30 blur-[3px] z-10"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 30%, black 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 30%, black 75%)",
          }}
        />
        {/* 3. Soft bottom ambient feather haze */}
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-[12px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/25 to-transparent blur-[6px] z-10" />

        {/* ======================================================== */}
        {/* NAVBAR CONTENT (Always on Top with Z-Index 30) */}
        {/* ======================================================== */}
        <div className="relative z-30 flex h-full items-center justify-between px-4 sm:px-6 pointer-events-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <svg
                width="20"
                height="20"
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
              <div className="text-[15px] sm:text-[16px] font-black tracking-[0.14em] text-[var(--color-text-primary)]">
                VIDNOVA
              </div>
              <div className="mt-0.5 text-[7px] font-bold tracking-[0.35em] text-[var(--color-primary)]">
                SINCE 2026
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-6 xl:gap-7 lg:flex">
            <a
              href="#home"
              className="py-1 text-xs font-bold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)]"
            >
              {t("navigation:home")}
            </a>

            <a
              href="#features"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:features")}
            </a>

            <a
              href="#how-it-works"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:howItWorks")}
            </a>

            <a
              href="#semantic-search"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:semanticSearch")}
            </a>

            <a
              href="#pricing"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:pricing")}
            </a>

            <a
              href="#about"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:about")}
            </a>

            <a
              href="#contact"
              className="py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t("navigation:contact")}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Language Switcher */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white/40 px-2.5 sm:px-3 text-[11px] font-bold text-[var(--color-text-primary)] backdrop-blur-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-xs"
              title={`Switch to ${language === "en" ? "Tiếng Việt" : "English"}`}
            >
              <Globe size={13} className="text-[var(--color-primary)]" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Sign In Link */}
            <Link
              to="/login"
              className="hidden h-8 sm:h-9 items-center justify-center rounded-full px-3 sm:px-4 text-xs font-semibold text-[var(--color-text-primary)] transition hover:text-[var(--color-primary)] sm:flex"
            >
              {t("navigation:login")}
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/40 text-[var(--color-text-secondary)] shadow-xs transition hover:text-[var(--color-primary)] lg:hidden"
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE NAVIGATION DROPDOWN SHEET (Visible on < lg when open) */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 max-w-[1320px] rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/95 p-5 shadow-2xl backdrop-blur-2xl transition-all duration-200 animate-dropdown-reveal lg:hidden">
          <nav className="flex flex-col space-y-1">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:home")}
            </a>

            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:features")}
            </a>

            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:howItWorks")}
            </a>

            <a
              href="#semantic-search"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:semanticSearch")}
            </a>

            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:pricing")}
            </a>

            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:about")}
            </a>

            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:contact")}
            </a>
          </nav>

          <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:login")}
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/register");
              }}
              className="flex-1 flex h-10 items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
            >
              <span>{t("navigation:register")}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}