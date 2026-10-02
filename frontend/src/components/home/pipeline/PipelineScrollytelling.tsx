import React, { useEffect, useRef, useState } from "react";
import {
  Video,
  AudioWaveform,
  Mic,
  Languages,
  Volume2,
} from "lucide-react";
import FolderSequenceCanvas from "../FolderSequenceCanvas";

interface PipelineStepItem {
  id: string;
  stepNum: string;
  folder: string;
  badge: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  tech: string;
  outputs: string[];
}

export default function PipelineScrollytelling() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Global scroll progress for pipeline runway (0 to 1)
  const [scrollProgress, setScrollProgress] = useState(0);

  const steps: PipelineStepItem[] = [
    {
      id: "ingestion",
      stepNum: "01",
      folder: "/assets/pipeline_1",
      badge: "Video Ingestion",
      title: "Stream Ingestion & Adaptive Chunking",
      desc: "Hardware-accelerated decoding handling 4K/8K H.264, HEVC, and ProRes. Live video streams are partitioned with millisecond chunk boundaries.",
      icon: Video,
      tech: "FFmpeg Hardware Acceleration • MP4 / MKV / MOV / ProRes",
      outputs: ["Adaptive Stream Partitioning", "Metadata Header Parsing", "Lossless Audio Demux"],
    },
    {
      id: "separation",
      stepNum: "02",
      folder: "/assets/pipeline_2",
      badge: "Audio Separation",
      title: "Vocal Isolation & Speech Waveform Cleaning",
      desc: "Deep neural audio separation separates vocal stems from music tracks and background noise, outputting 48kHz studio-grade clean dialog.",
      icon: AudioWaveform,
      tech: "Hybrid Demucs v4 Neural Stem Isolator",
      outputs: ["Isolated Vocal Track", "Denoised Spectrum", "Clean Speech Waveform"],
    },
    {
      id: "stt",
      stepNum: "03",
      folder: "/assets/pipeline_3",
      badge: "STT & Diarization",
      title: "Whisper Transcription & Speaker Diarization",
      desc: "Word-level timestamping combined with biometric voice clustering to distinguish speakers across high-speed dynamic conversations.",
      icon: Mic,
      tech: "Faster-Whisper large-v3 • PyAnnote 3.1 Diarization",
      outputs: ["Word-Level Timestamps", "Speaker ID Clustering", "99.2% Accuracy Transcript"],
    },
    {
      id: "translation",
      stepNum: "04",
      folder: "/assets/pipeline_4",
      badge: "Neural Translation",
      title: "Contextual Neural Translation & Routing",
      desc: "Context-aware neural translation routing seamlessly between English, Vietnamese, Japanese, Spanish, and 100+ global languages with cultural tone preservation.",
      icon: Languages,
      tech: "NLLB-200 MoE + LLM Contextual Prompting",
      outputs: ["EN -> VI / JA / ES / FR", "Terminology Alignment", "Semantic Tone Preservation"],
    },
    {
      id: "dubbing_export",
      stepNum: "05",
      folder: "/assets/pipeline_5",
      badge: "Dubbing & Multi-Asset Export",
      title: "Voice Cloning Dubbing & Universal Deliverables",
      desc: "Zero-shot voice cloning synthesizes target-language speech matching speaker emotion and cadence, exported in ready-to-publish MP4, SRT, and DOCX.",
      icon: Volume2,
      tech: "Coqui XTTS v2 • SRT/VTT Engine • Multi-Asset Remux",
      outputs: ["100% Lip-Synced Dubbed MP4", "Frame-Accurate Subtitles (SRT/VTT)", "Knowledge Summaries & DOCX Export"],
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalScrollable = container.scrollHeight - window.innerHeight;

      if (totalScrollable <= 0) return;

      const current = -rect.top;
      const progress = Math.max(0, Math.min(0.9999, current / totalScrollable));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stepCount = steps.length;
  const stepSize = 1 / stepCount;
  const activeStepIndex = Math.min(stepCount - 1, Math.floor(scrollProgress / stepSize));
  const stepLocalProgress = (scrollProgress - activeStepIndex * stepSize) / stepSize;
  const currentStep = steps[activeStepIndex];

  return (
    <div
      id="how-it-works"
      ref={containerRef}
      className="relative w-full bg-[#F8F9FA] transition-colors duration-200"
      style={{ height: "450vh" }}
    >
      {/* Sticky Full-Bleed Viewport Theater (Zero boxed white borders or rigid cards) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-[#F8F9FA]">
        {/* Soft diffused light gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[600px] rounded-full bg-gradient-to-tr from-[#0A8450]/7 via-[#00C7BE]/9 to-transparent blur-[160px]" />
          <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] rounded-full bg-[#00C7BE]/7 blur-[120px]" />
        </div>

        {/* Full-bleed HTML5 Canvas Stage */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10">
          <FolderSequenceCanvas
            folderPath={currentStep.folder}
            frameCount={300}
            progress={stepLocalProgress}
            priorityFrameCount={45}
            className="w-full h-full"
          />
        </div>

        {/* Minimalist Floating Editorial Glass Overlay (Purged of top tracker bars) */}
        <div className="relative z-20 w-full max-w-[1360px] h-full mx-auto px-6 sm:px-10 flex flex-col justify-center py-12 pointer-events-none">
          {/* Center-Right Floating Architectural Detail Panel */}
          <div className="w-full flex justify-end">
            <div className="w-full max-w-[440px] pointer-events-auto rounded-3xl border border-white/80 bg-white/75 p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300">
              {/* Node Identifier */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#0A8450]">
                  Node {currentStep.stepNum} of 05
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D1D1F] text-white">
                  {React.createElement(currentStep.icon, { size: 18 })}
                </div>
              </div>

              {/* Title & Description */}
              <h4 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] leading-snug">
                {currentStep.title}
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-[#6E6E73]">
                {currentStep.desc}
              </p>

              {/* Technical Specifications */}
              <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-3.5 border border-[#E5E7EB]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73] block mb-1">
                  Engine & Model
                </span>
                <p className="font-mono text-xs font-semibold text-[#1D1D1F]">
                  {currentStep.tech}
                </p>
              </div>

              {/* Deliverables / Outputs */}
              <div className="mt-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73] block">
                  Generated Deliverables
                </span>
                {currentStep.outputs.map((out, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium text-[#1D1D1F]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0A8450] shrink-0" />
                    <span>{out}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
