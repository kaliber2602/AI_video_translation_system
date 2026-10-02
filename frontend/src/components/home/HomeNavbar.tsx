import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../app/providers/LanguageContext";
import RippleDistortion from "../common/RippleDistortion";
import logoTopbar from "../../assets/logo-topbar.png";

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
      <div className="mx-auto max-w-[1320px] h-[74px] sm:h-[84px] relative rounded-full overflow-hidden border border-[var(--color-border)]/50 bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.03),0_4px_24px_color-mix(in_srgb,var(--color-primary)_12%,transparent)] backdrop-blur-lg backdrop-saturate-150 transition-all">
        
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
          <Link to="/" className="flex items-center group">
            <img
              src={logoTopbar}
              alt="VIDNOVA"
              width={360}
              height={66}
              className="h-14 sm:h-[66px] w-auto max-w-[310px] sm:max-w-[360px] object-contain transition-transform duration-200 group-hover:scale-[1.02] select-none"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-4 xl:gap-6 lg:flex">
            <a
              href="#home"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)] inline-flex items-center"
            >
              {t("navigation:home")}
            </a>

            <a
              href="#features"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
            >
              {t("navigation:features")}
            </a>

            <a
              href="#how-it-works"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
            >
              {t("navigation:howItWorks")}
            </a>

            <a
              href="#semantic-search"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
            >
              {t("navigation:semanticSearch")}
            </a>

            <a
              href="#pricing"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
            >
              {t("navigation:pricing")}
            </a>

            <a
              href="#about"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
            >
              {t("navigation:about")}
            </a>

            <a
              href="#contact"
              className="px-2.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] inline-flex items-center"
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
              className="flex h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white/50 dark:bg-white/10 px-3.5 text-xs font-bold text-[var(--color-text-primary)] backdrop-blur-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-xs cursor-pointer"
              title={`Switch to ${language === "en" ? "Tiếng Việt" : "English"}`}
            >
              <Globe size={14} className="text-[var(--color-primary)]" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Sign In Link */}
            <Link
              to="/login"
              onMouseEnter={() => import("../../pages/Login")}
              onPointerDown={() => import("../../pages/Login")}
              className="hidden h-10 items-center justify-center rounded-full px-3.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] transition hover:text-[var(--color-primary)] sm:flex"
            >
              {t("navigation:login")}
            </Link>

            {/* Right-aligned Gradient CTA Button ("Get Started") */}
            <button
              type="button"
              onMouseEnter={() => import("../../pages/Register")}
              onPointerDown={() => import("../../pages/Register")}
              onClick={() => navigate("/register")}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-[#0A8450] to-[#00C7BE] text-xs sm:text-sm font-bold text-white shadow-[0_4px_18px_rgba(10,132,80,0.25)] transition-all hover:scale-105 hover:shadow-[0_6px_22px_rgba(0,199,190,0.35)] cursor-pointer"
            >
              <span>{t("navigation:register") || "Get Started"}</span>
              <span className="text-sm">→</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/50 dark:bg-white/10 text-[var(--color-text-secondary)] shadow-xs transition hover:text-[var(--color-primary)] lg:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
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
              onMouseEnter={() => import("../../pages/Login")}
              onPointerDown={() => import("../../pages/Login")}
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {t("navigation:login")}
            </Link>

            <button
              type="button"
              onMouseEnter={() => import("../../pages/Register")}
              onPointerDown={() => import("../../pages/Register")}
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