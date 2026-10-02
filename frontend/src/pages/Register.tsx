import { BrainCircuit, Globe2, Languages, Mic2 } from "lucide-react";
import AuthBrand from "../components/auth/AuthBrand";
import RegisterForm from "../components/auth/RegisterForm";
import bgGlobalLogin from "../assets/bg-global_login.webp";
import bgLoginForm from "../assets/bg-login_form.webp";
import logoTopbar from "../assets/logo-topbar.png";
import registerHero from "../assets/register-hero.webp";

export default function Register() {
  return (
    <div
      data-theme="default_theme"
      className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-primary)] page-enter"
    >
      {/* ================= Global Page Background ================= */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-90 dark:opacity-40 transition-opacity duration-300"
        style={{ backgroundImage: `url(${bgGlobalLogin})` }}
      />

      {/* ================= Glow Orbs ================= */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left Glow */}
        <div className="absolute -top-60 -left-72 h-[900px] w-[900px] rounded-full bg-[var(--color-primary)]/10 blur-[180px]" />

        {/* Top Right Glow */}
        <div className="absolute -right-52 -top-24 h-[700px] w-[700px] rounded-full bg-[var(--color-primary-soft)]/40 blur-[160px]" />

        {/* Bottom Glow */}
        <div className="absolute bottom-[-250px] left-[25%] h-[900px] w-[900px] rounded-full bg-[var(--color-secondary)]/10 blur-[200px]" />

        {/* Large Ambient Glow */}
        <div className="absolute left-1/2 top-[-280px] h-[900px] w-[1800px] -translate-x-1/2 rounded-full bg-[var(--color-surface)]/50 blur-[180px]" />
      </div>

      {/* ================= Main ================= */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6 md:p-8 xl:p-12">
        <div
          className="relative flex w-full max-w-[1520px] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-cover bg-center bg-no-repeat shadow-2xl transition-colors duration-200"
          style={{ backgroundImage: `url(${bgLoginForm})` }}
        >
          {/* LEFT SIDE (HERO) */}
          <section className="relative z-10 hidden overflow-hidden bg-transparent px-12 py-12 lg:block lg:w-[58%] xl:px-16 transition-colors duration-200">
          {/* Decorative lines */}
          <div className="absolute left-0 top-[120px] h-px w-full rotate-[-3deg] bg-[var(--color-border)]" />

          <div className="absolute left-[-100px] top-[400px] h-[260px] w-[700px] rounded-[50%] border border-[var(--color-border)] opacity-40" />

          <div className="absolute bottom-[-100px] right-[-100px] h-[320px] w-[620px] rounded-[50%] border border-[var(--color-border)] opacity-40" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="relative z-20 flex justify-start items-center">
              <img
                src={logoTopbar}
                alt="VIDNOVA"
                className="h-[68px] sm:h-[82px] w-auto max-w-[400px] sm:max-w-[470px] object-contain select-none -ml-[18px] sm:-ml-[22px] translate-y-[-1px] sm:translate-y-[-1px]"
              />
            </div>

            <div className="relative z-10 max-w-[600px]">
              <div className="mb-4 h-1 w-10 rounded bg-[#27C6B4]" />

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

                  <div className="relative h-[calc(100%-44px)] w-full overflow-hidden bg-slate-900">
                    <img
                      src={registerHero}
                      alt="Register Hero"
                      className="h-full w-full object-cover select-none"
                    />
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

        {/* RIGHT SIDE (REGISTER FORM) */}
        <section className="relative z-10 flex w-full items-center justify-center bg-transparent px-3 py-6 sm:px-6 sm:py-10 lg:w-[42%] lg:px-12 transition-colors duration-200">
          <div className="relative w-full max-w-[560px] rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-5 sm:p-8 md:p-10 lg:p-12 backdrop-blur-2xl shadow-xl transition-colors duration-200">
            {/* Mobile logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <AuthBrand imageClassName="h-16 sm:h-20" />
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
  </div>
  );
}