import { useState } from "react";
import {
  Video,
  AudioWaveform,
  Mic,
  Languages,
  Subtitles,
  Volume2,
  Layers,
  Sparkles,
  Play,
  FileText,
  Download,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PipelineDiagram() {
  const { t } = useTranslation(["home"]);
  const [activeNode, setActiveNode] = useState<string>("stt");

  const nodes = [
    {
      id: "input",
      title: t("home:diagram.nodes.input.title"),
      badge: t("home:diagram.nodes.input.badge"),
      desc: t("home:diagram.nodes.input.description"),
      icon: Video,
      tech: "H.264 / ProRes / MP4",
      highlight: "Raw Ingestion",
    },
    {
      id: "extraction",
      title: t("home:diagram.nodes.extraction.title"),
      badge: t("home:diagram.nodes.extraction.badge"),
      desc: t("home:diagram.nodes.extraction.description"),
      icon: AudioWaveform,
      tech: "Demucs v4 Neural Splitter",
      highlight: "Vocal vs BGM",
    },
    {
      id: "stt",
      title: t("home:diagram.nodes.stt.title"),
      badge: t("home:diagram.nodes.stt.badge"),
      desc: t("home:diagram.nodes.stt.description"),
      icon: Mic,
      tech: "Whisper large-v3 + Diarization",
      highlight: "Multi-Speaker Timestamps",
    },
    {
      id: "translation",
      title: t("home:diagram.nodes.translation.title"),
      badge: t("home:diagram.nodes.translation.badge"),
      desc: t("home:diagram.nodes.translation.description"),
      icon: Languages,
      tech: "NLLB-200 + Context Prompting",
      highlight: "100+ Target Languages",
    },
    {
      id: "subtitles",
      title: t("home:diagram.nodes.subtitles.title"),
      badge: t("home:diagram.nodes.subtitles.badge"),
      desc: t("home:diagram.nodes.subtitles.description"),
      icon: Subtitles,
      tech: "SRT / VTT / ASS Sync Engine",
      highlight: "Frame-Accurate Subtitles",
    },
    {
      id: "dubbing",
      title: t("home:diagram.nodes.dubbing.title"),
      badge: t("home:diagram.nodes.dubbing.badge"),
      desc: t("home:diagram.nodes.dubbing.description"),
      icon: Volume2,
      tech: "Coqui XTTS v2 + Voice Clone",
      highlight: "Emotion & Cadence Matching",
    },
    {
      id: "export",
      title: t("home:diagram.nodes.export.title"),
      badge: t("home:diagram.nodes.export.badge"),
      desc: t("home:diagram.nodes.export.description"),
      icon: Download,
      tech: "Multi-Track Remuxing & Bundling",
      highlight: "Universal Deliverables",
    },
  ];

  return (
    <div className="w-full mt-14">
      {/* Diagram Section Header */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
            <Sparkles size={13} />
            <span>{t("home:pipelineSection.diagramBadge")}</span>
          </div>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {t("home:pipelineSection.diagramTitle")}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm max-w-[680px]">
            {t("home:pipelineSection.diagramSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          </span>
          <span>{t("home:pipelineSection.liveStreamNote")}</span>
        </div>
      </div>

      {/* Main Diagram Container */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 lg:p-10 shadow-[var(--shadow-card)] transition-all">
        {/* Subtle background ambient mesh */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(21,194,168,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.05),transparent_50%)]" />

        {/* ======================================================== */}
        {/* DESKTOP / TABLET WORKFLOW STREAM */}
        {/* ======================================================== */}
        <div className="relative z-10 hidden lg:block">
          {/* Top Row: Nodes 1 -> 2 -> 3 -> 4 */}
          <div className="grid grid-cols-4 gap-6 items-stretch relative">
            {/* Horizontal flowing connector line for row 1 */}
            <div className="pointer-events-none absolute top-1/2 left-[12%] right-[12%] -translate-y-1/2 h-[2px] bg-gradient-to-r from-[var(--color-primary)]/40 via-[var(--color-primary)] to-[var(--color-primary)]/40 -z-0">
              <div className="h-full w-24 bg-gradient-to-r from-transparent via-white to-transparent animate-[pulse_2s_infinite]" />
            </div>

            {/* 1. Ingestion Node */}
            <button
              type="button"
              onClick={() => setActiveNode("input")}
              className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                activeNode === "input"
                  ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                  : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Video size={18} />
                </div>
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  Node 01
                </span>
              </div>

              <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                {t("home:diagram.nodes.input.title")}
              </h4>

              {/* Visual Preview Box */}
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Play size={12} className="text-[var(--color-primary)] fill-current" />
                  </div>
                  <div className="min-w-0 flex-1 text-[10px]">
                    <p className="truncate font-bold text-[var(--color-text-primary)]">Keynote_2026.mp4</p>
                    <p className="text-[9px] text-[var(--color-text-muted)]">1080p • 60 fps • 4:30</p>
                  </div>
                </div>
              </div>
            </button>

            {/* 2. Extraction Node */}
            <button
              type="button"
              onClick={() => setActiveNode("extraction")}
              className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                activeNode === "extraction"
                  ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                  : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <AudioWaveform size={18} />
                </div>
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  Node 02
                </span>
              </div>

              <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                {t("home:diagram.nodes.extraction.title")}
              </h4>

              {/* Visual Preview Box */}
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-[var(--color-primary)] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" /> Vocal Track
                  </span>
                  <span className="text-[var(--color-text-muted)]">Clean Speech</span>
                </div>
                <div className="flex items-center gap-0.5 h-3">
                  {[40, 70, 90, 60, 30, 80, 100, 50, 65, 85, 45, 95, 75, 40].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    />
                  ))}
                </div>
              </div>
            </button>

            {/* 3. STT & Diarization Node */}
            <button
              type="button"
              onClick={() => setActiveNode("stt")}
              className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                activeNode === "stt"
                  ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                  : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Mic size={18} />
                </div>
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  Node 03
                </span>
              </div>

              <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                {t("home:diagram.nodes.stt.title")}
              </h4>

              {/* Visual Preview Box */}
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[9px] space-y-1">
                <div className="flex items-center justify-between text-[8px] font-semibold text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1 font-bold text-purple-500">
                    <Users size={10} /> Speaker A
                  </span>
                  <span>00:12.4</span>
                </div>
                <p className="truncate text-[var(--color-text-secondary)] italic">
                  "Today we explore artificial intelligence..."
                </p>
              </div>
            </button>

            {/* 4. Translation Node */}
            <button
              type="button"
              onClick={() => setActiveNode("translation")}
              className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                activeNode === "translation"
                  ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                  : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Languages size={18} />
                </div>
                <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  Node 04
                </span>
              </div>

              <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                {t("home:diagram.nodes.translation.title")}
              </h4>

              {/* Visual Preview Box */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-[10px] font-bold">
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-600">EN</span>
                <span className="text-[var(--color-primary)]">➔</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-600">VI / JA / ES</span>
              </div>
            </button>
          </div>

          {/* Branching Streams Middle Section (Parallel Subtitles & Dubbing -> Export) */}
          <div className="mt-8 grid grid-cols-12 gap-6 items-center">
            {/* Left Branching Box (Subtitles & Dubbing) */}
            <div className="col-span-8 grid grid-cols-2 gap-6">
              {/* 5A. Subtitle Generator */}
              <button
                type="button"
                onClick={() => setActiveNode("subtitles")}
                className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                  activeNode === "subtitles"
                    ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                    : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Subtitles size={18} />
                  </div>
                  <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    Node 05A
                  </span>
                </div>

                <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                  {t("home:diagram.nodes.subtitles.title")}
                </h4>

                {/* Visual Video Frame Preview */}
                <div className="mt-3 relative h-16 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-end p-2 text-center">
                  <div className="inline-block self-center rounded bg-black/60 px-2 py-0.5 text-[8px] font-bold text-yellow-300">
                    Hôm nay chúng ta cùng khám phá AI
                  </div>
                </div>
              </button>

              {/* 5B. Voice Dubbing */}
              <button
                type="button"
                onClick={() => setActiveNode("dubbing")}
                className={`relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                  activeNode === "dubbing"
                    ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                    : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                    <Volume2 size={18} />
                  </div>
                  <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    Node 05B
                  </span>
                </div>

                <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                  {t("home:diagram.nodes.dubbing.title")}
                </h4>

                {/* Visual Waveform Dubbing Preview */}
                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-teal-600 mb-1">
                    <span>Neural Voice Synthesis</span>
                    <span>100% Synced</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-3">
                    {[50, 80, 40, 90, 70, 100, 60, 40, 85, 95, 65, 35].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="flex-1 rounded-full bg-teal-500"
                      />
                    ))}
                  </div>
                </div>
              </button>
            </div>

            {/* Right Node: 06. Final Export Synthesis */}
            <div className="col-span-4">
              <button
                type="button"
                onClick={() => setActiveNode("export")}
                className={`w-full text-left rounded-2xl border p-5 transition-all duration-300 ${
                  activeNode === "export"
                    ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-[0_10px_30px_rgba(21,194,168,0.15)] ring-2 ring-[var(--color-primary)]/20 -translate-y-1"
                    : "border-[var(--color-border)] bg-[var(--color-background)]/80 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Download size={18} />
                  </div>
                  <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    Node 06
                  </span>
                </div>

                <h4 className="mt-3 text-xs font-black text-[var(--color-text-primary)]">
                  {t("home:diagram.nodes.export.title")}
                </h4>

                {/* Visual Deliverables Matrix */}
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[9px] font-bold">
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-teal-600">
                    <Play size={10} /> MP4 (Dubbed)
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-amber-600">
                    <FileText size={10} /> SRT / VTT
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-blue-600">
                    <Layers size={10} /> DOCX / PDF
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-purple-600">
                    <Volume2 size={10} /> MP3 Audio
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MOBILE WORKFLOW STREAM (Vertical Cards with Flow Arrows) */}
        {/* ======================================================== */}
        <div className="space-y-4 lg:hidden">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isSelected = activeNode === node.id;

            return (
              <div key={node.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveNode(node.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-background)] shadow-md"
                      : "border-[var(--color-border)] bg-[var(--color-background)]/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[var(--color-text-primary)]">
                          {node.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                          {node.badge}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[var(--color-primary)]">
                      {node.highlight}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {node.desc}
                  </p>
                </button>

                {index < nodes.length - 1 && (
                  <div className="my-1 flex justify-center text-[var(--color-primary)]">
                    ↓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE NODE DEEP DIVE TOOLTIP BANNER */}
        {/* ======================================================== */}
        {activeNode && (
          <div className="mt-8 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-background)] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                  {nodes.find((n) => n.id === activeNode)?.badge} • {nodes.find((n) => n.id === activeNode)?.tech}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">
                  {nodes.find((n) => n.id === activeNode)?.desc}
                </p>
              </div>
            </div>

            <span className="self-end sm:self-center text-[10px] font-bold text-[var(--color-text-muted)] italic">
              {t("home:diagram.interactiveHint")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
