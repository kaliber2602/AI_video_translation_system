import {
  BrainCircuit,
  Languages,
  Globe,
  AudioLines,
} from "lucide-react";
import HeroIllustration from "./HeroIllustration";
import logoTopbar from "../../assets/logo-topbar.png";

export default function Hero() {
  return (
    <section className="relative h-full overflow-hidden bg-transparent">
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-12 py-12 xl:px-16">
        {/* Brand */}
        <div className="relative z-20 flex justify-start items-center">
          <img
            src={logoTopbar}
            alt="VIDNOVA"
            className="h-[68px] sm:h-[82px] w-auto max-w-[400px] sm:max-w-[470px] object-contain select-none -ml-[18px] sm:-ml-[22px] translate-y-[-1px] sm:translate-y-[-1px]"
          />
        </div>

        {/* Headline */}
        <div className="relative z-10">
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