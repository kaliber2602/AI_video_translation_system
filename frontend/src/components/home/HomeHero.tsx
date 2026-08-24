import {
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import HomeProductPreview from "./HomeProductPreview";

export default function HomeHero() {
  const { t } = useTranslation(["home", "common"]);
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[var(--color-background)] transition-colors duration-200"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-100px] top-[-180px] h-[500px] w-[500px] rounded-full bg-[var(--color-primary-soft)] opacity-60 blur-3xl" />
        <div className="absolute left-[-180px] top-[350px] h-[400px] w-[400px] rounded-full bg-[var(--color-primary-soft)] opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 pb-16 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-12">
        {/* Left */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
            <Sparkles size={13} />
            {t("home:badge")}
          </div>

          <h1 className="max-w-[650px] text-[42px] font-black leading-[1.08] tracking-[-1.8px] text-[var(--color-text-primary)] sm:text-[52px] lg:text-[58px]">
            {t("home:heroTitlePrefix")}{" "}
            <span className="text-[var(--color-primary)]">
              {t("home:heroTitleHighlight")}
            </span>{" "}
            {t("home:heroTitleSuffix")}
          </h1>

          <p className="mt-6 max-w-[580px] text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
            {t("home:heroSubtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="flex h-12 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(24,195,170,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
            >
              {t("home:startFree")}
              <span>→</span>
            </button>

            <a
              href="#features"
              className="flex h-12 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {t("home:viewDemo")}
              <PlayCircle size={17} />
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["A", "N", "M", "T"].map((letter) => (
                <div
                  key={letter}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-primary)] text-xs font-bold text-white"
                >
                  {letter}
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {t("home:trustedBy")}
              </p>

              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm tracking-[2px] text-[var(--color-primary)]">
                  ★★★★★
                </span>

                <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                  5.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <HomeProductPreview />
      </div>
    </section>
  );
}