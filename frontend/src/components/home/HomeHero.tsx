import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  PlayCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import FolderSequenceCanvas from "./FolderSequenceCanvas";

export default function HomeHero() {
  const { t } = useTranslation(["home", "common"]);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalScrollable = container.scrollHeight - window.innerHeight;

      if (totalScrollable <= 0) {
        setScrollProgress(0);
        return;
      }

      const current = -rect.top;
      const progress = Math.max(0, Math.min(1, current / totalScrollable));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Multi-phase sequence switching:
  // Phase 1 (0 to 0.35): hero-illustration_1
  // Phase 2 (0.35 to 0.70): hero-illustration_2
  // Phase 3 (0.70 to 1.0): hero-illustration_3
  let activeSubSequence: 1 | 2 | 3 = 1;
  let subProgress = 0;

  if (scrollProgress < 0.35) {
    activeSubSequence = 1;
    subProgress = scrollProgress / 0.35;
  } else if (scrollProgress < 0.7) {
    activeSubSequence = 2;
    subProgress = (scrollProgress - 0.35) / 0.35;
  } else {
    activeSubSequence = 3;
    subProgress = (scrollProgress - 0.7) / 0.3;
  }
  subProgress = Math.max(0, Math.min(1, subProgress));

  // Pure Apple narrative chapter thresholds
  const isPhase1 = scrollProgress < 0.33;
  const isPhase2 = scrollProgress >= 0.33 && scrollProgress < 0.66;
  const isPhase3 = scrollProgress >= 0.66;

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative w-full bg-[#F8F9FA] transition-colors duration-200"
      style={{ height: "350vh" }}
    >
      {/* Sticky Fullscreen Scrollytelling Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-[#F8F9FA]">
        {/* Luminous light aura */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full bg-gradient-to-tr from-[#0A8450]/8 via-[#00C7BE]/10 to-transparent blur-[140px]" />
          <div className="absolute bottom-10 right-10 w-[450px] h-[350px] rounded-full bg-[#00C7BE]/8 blur-[110px]" />
        </div>

        {/* Full-bleed HTML5 Canvas Sequence */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10">
          <FolderSequenceCanvas
            folderPath={`/assets/hero-illustration_${activeSubSequence}`}
            frameCount={300}
            progress={subProgress}
            priorityFrameCount={5}
            className="w-full h-full"
          />
        </div>

        {/* Floating Apple-Grade Narrative Typography (Purged of any tracker bars or badges) */}
        <div className="relative z-20 w-full max-w-[1360px] h-full mx-auto px-6 sm:px-10 flex flex-col justify-center py-12 pointer-events-none">
          {/* Center Dynamic Storytelling Headline & Content */}
          <div className="my-auto mx-auto max-w-[940px] text-center">
            {/* Story 01: Main Hero Reveal */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                isPhase1
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-8 pointer-events-none absolute inset-x-0"
              }`}
            >
              <h1 className="text-4xl font-black tracking-[-0.035em] text-[#1D1D1F] sm:text-6xl lg:text-[76px] leading-[1.04]">
                Transform every video into{" "}
                <span className="bg-gradient-to-r from-[#0A8450] via-[#00C7BE] to-[#0A8450] bg-clip-text text-transparent">
                  valuable knowledge.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-[640px] text-base leading-relaxed text-[#6E6E73] sm:text-lg lg:text-xl font-normal">
                Next-gen AI video intelligence, transcription, and instant translation.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onMouseEnter={() => import("../../pages/Register")}
                  onPointerDown={() => import("../../pages/Register")}
                  onClick={() => navigate("/register")}
                  className="group relative flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-[#0A8450] to-[#00C7BE] px-8 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(10,132,80,0.28)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_32px_rgba(0,199,190,0.35)] cursor-pointer"
                >
                  <span>{t("home:startFree") || "Get Started"}</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </button>

                <a
                  href="#how-it-works"
                  className="flex h-12 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white/90 px-6 text-sm font-semibold text-[#1D1D1F] shadow-sm backdrop-blur-md transition-all hover:border-[#0A8450]/40 hover:bg-white cursor-pointer"
                >
                  <PlayCircle size={17} className="text-[#0A8450]" />
                  <span>See How It Works</span>
                </a>
              </div>
            </div>

            {/* Story 02: Neural Decoupling & Stem Isolation */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                isPhase2
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none absolute inset-x-0"
              }`}
            >
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#1D1D1F] sm:text-5xl lg:text-6xl leading-tight">
                Lossless Stem Isolation & Waveform Cleaning.
              </h2>
              <p className="mx-auto mt-5 max-w-[620px] text-base leading-relaxed text-[#6E6E73] sm:text-lg">
                Deep neural models isolate speech vocals from music and ambient noise with zero phase distortion, providing pristine inputs for real-time transcription.
              </p>
            </div>

            {/* Story 03: Global Multilingual Synthesis */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                isPhase3
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none absolute inset-x-0"
              }`}
            >
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#1D1D1F] sm:text-5xl lg:text-6xl leading-tight">
                Zero-Shot Dubbing in 100+ World Languages.
              </h2>
              <p className="mx-auto mt-5 max-w-[620px] text-base leading-relaxed text-[#6E6E73] sm:text-lg">
                Whisper large-v3 and neural voice cloning replicate cadence, tone, and emotional inflection for cinema-grade localized video exports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}