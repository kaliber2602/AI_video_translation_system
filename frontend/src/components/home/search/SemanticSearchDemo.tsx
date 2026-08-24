import { useState } from "react";
import {
  Search,
  Sparkles,
  Bot,
  Play,
  FileVideo,
  CheckCircle2,
  ExternalLink,
  MessageSquareQuote,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SemanticSearchDemo() {
  const { t } = useTranslation(["home"]);
  const [selectedQueryIndex, setSelectedQueryIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const queryItems = [
    {
      id: "q1",
      query: t("home:semanticSearch.questions.q1"),
      answer: t("home:semanticSearch.aiAnswer.answers.a1"),
      results: [
        {
          timestamp: "00:12:43",
          speaker: "Speaker A (Dr. Evans)",
          relevance: 98,
          video: "AI_Keynote_Overview.mp4",
          snippet: "...artificial intelligence can automate repetitive translation tasks and analyze large video datasets with human-grade consistency...",
        },
        {
          timestamp: "00:28:15",
          speaker: "Speaker B (Sarah Chen)",
          relevance: 94,
          video: "AI_Keynote_Overview.mp4",
          snippet: "...by removing manual subtitle timing, production teams accelerate delivery cycles by over 10x without sacrificing quality...",
        },
      ],
      sources: [
        { time: "00:12:43", video: "AI_Keynote_Overview.mp4" },
        { time: "00:28:15", video: "AI_Keynote_Overview.mp4" },
      ],
    },
    {
      id: "q2",
      query: t("home:semanticSearch.questions.q2"),
      answer: t("home:semanticSearch.aiAnswer.answers.a2"),
      results: [
        {
          timestamp: "00:41:20",
          speaker: "Speaker A (Dr. Evans)",
          relevance: 99,
          video: "Platform_Economics_Pricing.mp4",
          snippet: "...our subscription tiers scale from Free to Pro and Business, with optional storage add-ons providing flexible gigabytes without modifying your base tier...",
        },
        {
          timestamp: "00:45:05",
          speaker: "Speaker A (Dr. Evans)",
          relevance: 92,
          video: "Platform_Economics_Pricing.mp4",
          snippet: "...monthly AI processing minutes automatically reset each billing cycle, with clear usage meters in the client dashboard...",
        },
      ],
      sources: [
        { time: "00:41:20", video: "Platform_Economics_Pricing.mp4" },
        { time: "00:45:05", video: "Platform_Economics_Pricing.mp4" },
      ],
    },
    {
      id: "q3",
      query: t("home:semanticSearch.questions.q3"),
      answer: t("home:semanticSearch.aiAnswer.answers.a3"),
      results: [
        {
          timestamp: "01:05:12",
          speaker: "Speaker C (Lead Architect)",
          relevance: 97,
          video: "System_Architecture_DeepDive.mp4",
          snippet: "...we decoupled the STT transcription worker from the NLLB neural translation service using an asynchronous job queue for optimal GPU utilization...",
        },
        {
          timestamp: "01:14:40",
          speaker: "Speaker C (Lead Architect)",
          relevance: 93,
          video: "System_Architecture_DeepDive.mp4",
          snippet: "...multi-speaker voice synthesis pipelines execute in parallel to ensure low latency even on 4K multi-track long-form videos...",
        },
      ],
      sources: [
        { time: "01:05:12", video: "System_Architecture_DeepDive.mp4" },
        { time: "01:14:40", video: "System_Architecture_DeepDive.mp4" },
      ],
    },
  ];

  const currentItem = queryItems[selectedQueryIndex];

  const handleSelectQuery = (index: number) => {
    setIsSearching(true);
    setSelectedQueryIndex(index);
    setTimeout(() => {
      setIsSearching(false);
    }, 200);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors">
        {/* Top Search Interface Bar */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]/70 p-6 sm:p-8">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--color-primary)]">
              <Search size={20} />
            </div>

            <input
              type="text"
              readOnly
              value={currentItem.query}
              aria-label="Semantic Search query"
              placeholder={t("home:semanticSearch.input.placeholder")}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-4 pl-12 pr-36 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />

            <div className="absolute inset-y-1.5 right-1.5 flex items-center">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">{t("home:semanticSearch.input.button")}</span>
              </button>
            </div>
          </div>

          {/* Suggested Query Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
              {t("home:semanticSearch.input.suggestedLabel")}
            </span>

            {queryItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectQuery(idx)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedQueryIndex === idx
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold shadow-sm"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text-primary)]"
                }`}
              >
                "{item.query}"
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Left Results + Right Grounded AI Answer */}
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-12">
          {/* Left Column: Semantic Video Segments (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                <FileVideo size={16} className="text-[var(--color-primary)]" />
                <span>{t("home:semanticSearch.results.header")}</span>
              </div>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-black text-[var(--color-primary)]">
                {currentItem.results.length} Segments Found
              </span>
            </div>

            {/* Result items */}
            <div className={`space-y-3 transition-opacity duration-200 ${isSearching ? "opacity-40" : "opacity-100"}`}>
              {currentItem.results.map((res, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4.5 transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Timestamp badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-xs font-mono font-black text-white shadow-sm">
                        <Play size={10} fill="currentColor" />
                        {res.timestamp}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {res.speaker}
                      </span>
                    </div>

                    {/* Relevance match badge */}
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                      {res.relevance}% {t("home:semanticSearch.results.relevance")}
                    </span>
                  </div>

                  {/* Transcript quote snippet */}
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    <MessageSquareQuote size={16} className="shrink-0 text-[var(--color-primary)] mt-0.5" />
                    <p className="italic">{res.snippet}</p>
                  </div>

                  {/* Footer with Video source */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                    <span className="font-semibold">{res.video}</span>
                    <span className="flex items-center gap-1 font-bold text-[var(--color-primary)] transition group-hover:underline">
                      {t("home:semanticSearch.results.jumpTo")} <ExternalLink size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Grounded AI Answer (5 cols) */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-[var(--color-primary)]/30 bg-gradient-to-b from-[var(--color-primary-soft)]/20 via-[var(--color-surface)] to-[var(--color-surface)] p-6 shadow-sm flex flex-col justify-between">
              <div>
                {/* AI Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-md">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[var(--color-text-primary)]">
                        {t("home:semanticSearch.aiAnswer.title")}
                      </h4>
                      <span className="text-[10px] font-bold text-[var(--color-primary)]">
                        {t("home:semanticSearch.aiAnswer.badge")}
                      </span>
                    </div>
                  </div>

                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Grounded Text Answer */}
                <div className={`mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs sm:text-sm leading-relaxed text-[var(--color-text-primary)] shadow-inner transition-opacity duration-200 ${isSearching ? "opacity-40" : "opacity-100"}`}>
                  <p>{currentItem.answer}</p>
                </div>
              </div>

              {/* Citations & Sources list */}
              <div className="mt-6 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                  <CheckCircle2 size={13} className="text-[var(--color-primary)]" />
                  <span>{t("home:semanticSearch.aiAnswer.sourcesLabel")}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentItem.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] shadow-sm"
                    >
                      <Clock size={11} className="text-[var(--color-primary)]" />
                      <span className="font-mono font-bold text-[var(--color-primary)]">{src.time}</span>
                      <span className="text-[var(--color-text-muted)]">• {src.video}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
