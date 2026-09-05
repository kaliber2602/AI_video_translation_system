import { ArrowRight, BrainCircuit, Globe2, Languages, Mic2 } from "lucide-react";
import AuthBrand from "../components/auth/AuthBrand";
import RegisterForm from "../components/auth/RegisterForm";

export default function Register() {
  return (
    <div
      data-theme="default_theme"
      className="min-h-screen bg-[var(--color-background)] p-3 sm:p-5 page-enter transition-colors duration-200"
    >
      <div className="mx-auto grid min-h-[calc(100vh-24px)] w-full max-w-[1500px] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-colors duration-200 lg:grid-cols-[1.02fr_0.98fr]">
        {/* LEFT SIDE */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--color-surface-muted)] via-[var(--color-surface)] to-[var(--color-primary-soft)]/30 px-12 py-12 lg:block xl:px-16 transition-colors duration-200">
          {/* Decorative lines */}
          <div className="absolute left-0 top-[120px] h-px w-full rotate-[-3deg] bg-[var(--color-border)]" />

          <div className="absolute left-[-100px] top-[400px] h-[260px] w-[700px] rounded-[50%] border border-[var(--color-border)] opacity-40" />

          <div className="absolute bottom-[-100px] right-[-100px] h-[320px] w-[620px] rounded-[50%] border border-[var(--color-border)] opacity-40" />

          <div className="relative z-10 flex h-full flex-col">
            <AuthBrand />

            <div className="mt-20 max-w-[600px]">
              <div className="mb-5 h-1 w-9 rounded-full bg-[var(--color-primary)]" />

              <h2 className="text-[46px] font-bold leading-[1.08] tracking-[-1.8px] text-[var(--color-text-primary)] xl:text-[54px]">
                Turn your videos
                <br />
                into{" "}
                <span className="text-[var(--color-primary)]">
                  knowledge
                </span>
              </h2>

              <p className="mt-7 max-w-[540px] text-[17px] leading-8 text-[var(--color-text-secondary)]">
                Join VidNova and transform your videos with
                AI-powered translation, transcription, subtitles,
                natural dubbing, and intelligent knowledge extraction.
              </p>
            </div>

            {/* Illustration */}
            <div className="relative mt-14 flex flex-1 items-center justify-center">
              <div className="relative w-full max-w-[610px]">
                {/* Main browser */}
                <div className="relative mx-auto h-[280px] w-[78%] overflow-hidden rounded-[24px] bg-white shadow-[0_25px_55px_rgba(45,108,103,0.16)]">
                  <div className="flex h-11 items-center gap-2 border-b border-[#E7F0EF] px-5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B5E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFBE3D]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]" />
                  </div>

                  <div className="flex h-[calc(100%-44px)] items-center justify-center bg-[#EFF4F8]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#20C5AE] shadow-[0_10px_25px_rgba(32,197,174,0.35)]">
                      <ArrowRight
                        size={28}
                        className="rotate-[-45deg] text-white"
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-6 right-6 space-y-3">
                    <div className="h-2 rounded-full bg-[#DDE6ED]" />
                    <div className="h-2 w-[72%] rounded-full bg-[#DDE6ED]" />
                  </div>
                </div>

                {/* Feature floating cards */}
                <div className="absolute -right-2 top-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgba(44,80,85,0.13)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF7F2] text-[#18BFA7]">
                    <Languages size={18} />
                  </div>
                  <span className="text-sm font-semibold text-[#334154]">
                    AI Translation
                  </span>
                </div>

                <div className="absolute -right-6 top-[115px] flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgba(44,80,85,0.13)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF7F2] text-[#18BFA7]">
                    <span className="text-sm font-bold">CC</span>
                  </div>

                  <span className="text-sm font-semibold text-[#334154]">
                    Smart Subtitle
                  </span>
                </div>

                <div className="absolute -right-2 top-[195px] flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgba(44,80,85,0.13)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF7F2] text-[#18BFA7]">
                    <Mic2 size={18} />
                  </div>

                  <span className="text-sm font-semibold text-[#334154]">
                    Natural Dubbing
                  </span>
                </div>

                <div className="absolute -left-5 bottom-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgba(44,80,85,0.13)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF7F2] text-[#18BFA7]">
                    <BrainCircuit size={18} />
                  </div>

                  <span className="text-sm font-semibold text-[#334154]">
                    AI Knowledge
                  </span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 grid grid-cols-3 gap-5">
              <div className="flex items-center gap-3">
                <BrainCircuit
                  size={22}
                  className="shrink-0 text-[#19C4AC]"
                />

                <div>
                  <p className="text-sm font-semibold text-[#344454]">
                    Smart
                  </p>
                  <p className="text-[11px] text-[#7B91A4]">
                    AI Powered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Languages
                  size={22}
                  className="shrink-0 text-[#19C4AC]"
                />

                <div>
                  <p className="text-sm font-semibold text-[#344454]">
                    Translate
                  </p>
                  <p className="text-[11px] text-[#7B91A4]">
                    150+ Languages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Globe2
                  size={22}
                  className="shrink-0 text-[#19C4AC]"
                />

                <div>
                  <p className="text-sm font-semibold text-[#344454]">
                    Knowledge
                  </p>
                  <p className="text-[11px] text-[#7B91A4]">
                    Semantic Search
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[var(--color-surface)] px-4 py-8 sm:px-10 lg:px-12 xl:px-16 transition-colors duration-200">
          <div className="w-full max-w-[470px]">
            {/* Mobile logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <AuthBrand />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-[32px]">
                Create your account
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                Start transforming your videos with VidNova
              </p>
            </div>

            <RegisterForm />
          </div>
        </section>
      </div>
    </div>
  );
}