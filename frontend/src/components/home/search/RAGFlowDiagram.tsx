import {
  FileText,
  Binary,
  Target,
  Bot,
  XCircle,
  CheckCircle2,
  ArrowRight,
  Database,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RAGFlowDiagram() {
  const { t } = useTranslation(["home"]);

  const ragSteps = [
    {
      num: "01",
      icon: FileText,
      title: t("home:semanticSearch.ragFlow.step1"),
      desc: t("home:semanticSearch.ragFlow.step1Desc"),
      badge: "Whisper STT",
    },
    {
      num: "02",
      icon: Binary,
      title: t("home:semanticSearch.ragFlow.step2"),
      desc: t("home:semanticSearch.ragFlow.step2Desc"),
      badge: "Vector Embeddings",
    },
    {
      num: "03",
      icon: Target,
      title: t("home:semanticSearch.ragFlow.step3"),
      desc: t("home:semanticSearch.ragFlow.step3Desc"),
      badge: "Cosine Similarity",
    },
    {
      num: "04",
      icon: Bot,
      title: t("home:semanticSearch.ragFlow.step4"),
      desc: t("home:semanticSearch.ragFlow.step4Desc"),
      badge: "Grounded LLM",
    },
  ];

  const keywordPoints = t("home:semanticSearch.comparison.keywordPoints", { returnObjects: true }) as string[];
  const semanticPoints = t("home:semanticSearch.comparison.semanticPoints", { returnObjects: true }) as string[];

  return (
    <div className="mx-auto mt-16 max-w-[1400px]">
      {/* RAG Workflow Steps Header */}
      <div className="text-center max-w-[760px] mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
          <Database size={13} />
          <span>Retrieval-Augmented Generation</span>
        </div>

        <h3 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          {t("home:semanticSearch.ragFlow.title")}
        </h3>

        <p className="mt-2 text-xs text-[var(--color-text-secondary)] sm:text-sm">
          {t("home:semanticSearch.ragFlow.subtitle")}
        </p>
      </div>

      {/* 4-Step RAG Visual Pipeline */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ragSteps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-transform duration-200 group-hover:scale-110">
                    <Icon size={20} />
                  </div>
                  <span className="font-mono text-xs font-black text-[var(--color-text-muted)]">
                    STEP {step.num}
                  </span>
                </div>

                <h4 className="mt-4 text-xs font-black tracking-tight text-[var(--color-text-primary)] sm:text-sm">
                  {step.title}
                </h4>

                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {step.desc}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="rounded-md bg-[var(--color-background)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                  {step.badge}
                </span>

                {idx < ragSteps.length - 1 && (
                  <ArrowRight size={13} className="hidden text-[var(--color-text-muted)] lg:block" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Grid: Traditional vs VidNova Semantic Search */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Left: Traditional Keyword */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <XCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--color-text-primary)]">
                {t("home:semanticSearch.comparison.keyword")}
              </h4>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Exact Substring Token Matching
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {Array.isArray(keywordPoints) &&
              keywordPoints.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
                  <span className="shrink-0 text-rose-500 font-bold">✕</span>
                  <span>{pt}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Right: VidNova Semantic & RAG */}
        <div className="rounded-3xl border border-[var(--color-primary)]/40 bg-gradient-to-br from-[var(--color-primary-soft)]/20 via-[var(--color-surface)] to-[var(--color-surface)] p-6 sm:p-8 shadow-[0_10px_30px_rgba(21,194,168,0.1)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--color-text-primary)]">
                {t("home:semanticSearch.comparison.semantic")}
              </h4>
              <span className="text-[11px] font-bold text-[var(--color-primary)]">
                Contextual Vector AI + Source Grounding
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {Array.isArray(semanticPoints) &&
              semanticPoints.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--color-text-primary)] font-medium">
                  <span className="shrink-0 text-[var(--color-primary)] font-bold">✓</span>
                  <span>{pt}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
