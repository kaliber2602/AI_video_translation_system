import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function HomeCTA() {
  const { t } = useTranslation(["home", "common"]);
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-[var(--color-background)] px-5 pb-12 pt-16 transition-colors duration-200 lg:px-8 lg:pt-20">
      {/* Decorative waves */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[180px] w-[420px] opacity-40">
        <div className="absolute bottom-0 left-[-100px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[8deg]" />
        <div className="absolute bottom-[-20px] left-[-80px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[8deg]" />
        <div className="absolute bottom-[-40px] left-[-60px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[8deg]" />
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 h-[180px] w-[420px] opacity-40">
        <div className="absolute bottom-0 right-[-100px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[-8deg]" />
        <div className="absolute bottom-[-20px] right-[-80px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[-8deg]" />
        <div className="absolute bottom-[-40px] right-[-60px] h-[100px] w-[500px] rounded-[50%] border-t border-[var(--color-border)] rotate-[-8deg]" />
      </div>

      <div className="relative mx-auto max-w-[700px] text-center">
        <h2 className="text-3xl font-black tracking-[-1px] text-[var(--color-text-primary)] sm:text-4xl">
          {t("home:cta.titlePrefix")}{" "}
          <span className="text-[var(--color-primary)]">
            {t("home:cta.titleHighlight")}
          </span>{" "}
          {t("home:cta.titleSuffix")}
        </h2>

        <p className="mx-auto mt-4 max-w-[520px] text-sm leading-6 text-[var(--color-text-secondary)]">
          {t("home:cta.subtitle")}
        </p>

        <button
          type="button"
          onClick={() => navigate("/register")}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(32,197,174,0.25)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
        >
          {t("home:startFree")}
          <span>→</span>
        </button>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[var(--color-primary)]" />
            {t("home:cta.freeTrial")}
          </span>

          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[var(--color-primary)]" />
            {t("home:cta.noCreditCard")}
          </span>

          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[var(--color-primary)]" />
            {t("home:cta.cancelAnytime")}
          </span>
        </div>
      </div>
    </section>
  );
}