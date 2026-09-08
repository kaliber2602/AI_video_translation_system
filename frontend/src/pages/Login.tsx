import Hero from "../components/auth/Hero";
import LoginForm from "../components/auth/LoginForm";

export default function Login() {
  return (
    <div
      data-theme="default_theme"
      className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-primary)] page-enter"
    >
      {/* ================= Background ================= */}
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
        <div className="flex w-full max-w-[1520px] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 shadow-2xl backdrop-blur-xl transition-colors duration-200">
          {/* Hero */}
          <div className="hidden lg:block lg:w-[58%]">
            <Hero />
          </div>

          {/* Login */}
          <div className="relative flex w-full items-center justify-center bg-transparent px-3 py-6 sm:px-6 sm:py-10 lg:w-[42%] lg:px-12">
            <div className="relative w-full max-w-[560px] rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-5 sm:p-8 md:p-10 lg:p-12 backdrop-blur-2xl shadow-xl transition-colors duration-200">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}