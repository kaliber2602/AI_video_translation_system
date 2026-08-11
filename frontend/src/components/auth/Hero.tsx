import {
  BrainCircuit,
  Languages,
  Globe,
  AudioLines,
} from "lucide-react";
import HeroIllustration from "./HeroIllustration";

export default function Hero() {
  return (
    <section className="relative h-full overflow-hidden">

      {/* ================= Background ================= */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#F9FFFE] via-[#EEFCF9] to-[#DFF8F4]" />

      {/* Blur */}

      <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-cyan-200/30 blur-[100px]" />

      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-200/20 blur-[120px]" />

      {/* Decorative line */}

      <div
        className="
        absolute
        top-0
        left-0
        h-full
        w-full
        opacity-40
        "
      >
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

      {/* ================= Content ================= */}

      <div className="relative z-10 flex h-full flex-col px-16 py-12">

        {/* Logo */}

        <div className="flex items-center gap-4">

          <div className="h-14 w-14 rounded-xl border-2 border-dashed border-slate-300" />

          <div>

            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
              VIDNOVA
            </h2>

            <p className="mt-1 text-sm tracking-[6px] text-[#27C6B4]">
              SINCE 2026
            </p>

          </div>

        </div>

        {/* Headline */}

        <div className="mt-10">

          <div className="mb-4 h-1 w-10 rounded bg-[#27C6B4]" />

          <h1 className="text-[68px] font-black leading-[72px] text-slate-900">
            From Video
          </h1>

          <h1 className="mt-2 text-[68px] font-black leading-[72px] text-[#27C6B4]">
            to Knowledge
          </h1>

          <p className="mt-8 max-w-xl text-xl leading-9 text-slate-500">
            AI-powered video translation, transcription,
            subtitle generation and knowledge extraction.
          </p>

        </div>

        {/* ================= Illustration ================= */}

  <div className="mt-10 flex-1">

    <HeroIllustration/>

</div>

        {/* ================= Bottom ================= */}

        <div className="mt-12 flex justify-between">

          <Feature
            icon={<BrainCircuit size={28} />}
            title="Smart"
            desc="AI Powered"
          />

          <Feature
            icon={<Languages size={28} />}
            title="Translate"
            desc="150+ Languages"
          />

          <Feature
            icon={<Globe size={28} />}
            title="Knowledge"
            desc="Semantic Search"
          />

          <Feature
            icon={<AudioLines size={28} />}
            title="Voice AI"
            desc="Natural Dubbing"
          />

        </div>

      </div>

    </section>
  );
}

// function FloatingCard({
//   title,
//   top,
//   right,
// }: {
//   title: string;
//   top: string;
//   right: string;
// }) {
//   return (
//     <div
//       style={{
//         top,
//         right,
//       }}
//       className="
//       absolute
//       flex
//       items-center
//       gap-3
//       rounded-2xl
//       bg-white
//       px-5
//       py-4
//       shadow-xl
//       "
//     >
//       <div className="h-9 w-9 rounded-xl bg-[#27C6B4]/20" />

//       <span className="font-medium text-slate-700">

//         {title}

//       </span>
//     </div>
//   );
// }

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

      <div className="text-[#27C6B4]">

        {icon}

      </div>

      <div>

        <div className="font-semibold">

          {title}

        </div>

        <div className="text-sm text-gray-500">

          {desc}

        </div>

      </div>

    </div>
  );
}