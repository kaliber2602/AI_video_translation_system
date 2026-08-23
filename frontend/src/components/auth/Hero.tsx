import {
  BrainCircuit,
  Languages,
  Globe,
  AudioLines,
} from "lucide-react";
import HeroIllustration from "./HeroIllustration";
import AuthBrand from "./AuthBrand";

export default function Hero() {
  return (
    <section className="relative h-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F9FFFE] via-[#EEFCF9] to-[#DFF8F4]" />

      {/* Blur */}
      <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-cyan-200/30 blur-[100px]" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-200/20 blur-[120px]" />

      {/* Decorative line */}
      <div className="absolute top-0 left-0 h-full w-full opacity-40">
        <svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120 C300 30 500 220 900 120"
            stroke="#CDEFE8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0 500 C350 350 600 650 900 500"
            stroke="#CDEFE8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0 720 C250 560 600 820 900 680"
            stroke="#CDEFE8"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-12 py-12 xl:px-16">
        {/* Brand */}
        <div>
          <AuthBrand />
        </div>

        {/* Headline */}
        <div className="mt-10">
          <div className="mb-4 h-1 w-10 rounded bg-[#27C6B4]" />

          <h1 className="text-[52px] font-black leading-[56px] text-slate-900 xl:text-[64px] xl:leading-[68px]">
            From Video
          </h1>

          <h1 className="mt-2 text-[52px] font-black leading-[56px] text-[#27C6B4] xl:text-[64px] xl:leading-[68px]">
            to Knowledge
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-slate-500 xl:text-lg">
            AI-powered video translation, transcription,
            subtitle generation and knowledge extraction.
          </p>
        </div>

        {/* Illustration */}
        <div className="mt-8 flex-1">
          <HeroIllustration />
        </div>

        {/* Bottom Benefits */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Feature
            icon={<BrainCircuit size={24} />}
            title="Smart"
            desc="AI Powered"
          />

          <Feature
            icon={<Languages size={24} />}
            title="Translate"
            desc="150+ Languages"
          />

          <Feature
            icon={<Globe size={24} />}
            title="Knowledge"
            desc="Semantic Search"
          />

          <Feature
            icon={<AudioLines size={24} />}
            title="Voice AI"
            desc="Natural Dubbing"
          />
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
        {icon}
      </div>

      <div>
        <div className="text-xs font-bold text-slate-900">
          {title}
        </div>

        <div className="text-[11px] text-slate-500">
          {desc}
        </div>
      </div>
    </div>
  );
}