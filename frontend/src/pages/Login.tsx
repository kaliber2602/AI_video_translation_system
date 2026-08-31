import Hero from "../components/auth/Hero";
import LoginForm from "../components/auth/LoginForm";

export default function Login() {
  return (
    <div
      data-theme="default_theme"
      className="relative min-h-screen overflow-hidden bg-[#F4FAF9] page-enter"
    >
      {/* ================= Background ================= */}
      <div className="absolute inset-0">
        {/* Top Left Glow */}
        <div className="absolute -top-60 -left-72 h-[900px] w-[900px] rounded-full bg-cyan-200/40 blur-[180px]" />

        {/* Top Right Glow */}
        <div className="absolute -right-52 -top-24 h-[700px] w-[700px] rounded-full bg-emerald-200/40 blur-[160px]" />

        {/* Bottom Glow */}
        <div className="absolute bottom-[-250px] left-[25%] h-[900px] w-[900px] rounded-full bg-teal-100/50 blur-[200px]" />

        {/* Large White Glow */}
        <div className="absolute left-1/2 top-[-280px] h-[900px] w-[1800px] -translate-x-1/2 rounded-full bg-white/70 blur-[180px]" />

        {/* Bottom Mint Glow */}
        <div className="absolute -bottom-80 -left-60 h-[1000px] w-[1000px] rounded-full bg-[#72E3D6]/25 blur-[240px]" />

        {/* Right Cyan Glow */}
        <div className="absolute -right-60 bottom-[-200px] h-[800px] w-[800px] rounded-full bg-cyan-100/40 blur-[220px]" />
      </div>

      {/* ================= Main ================= */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6 md:p-8 xl:p-12">
        <div className="flex w-full max-w-[1520px] overflow-hidden rounded-2xl sm:rounded-[36px] lg:rounded-[40px] bg-white/65 shadow-[0_40px_120px_rgba(0,0,0,.12)] backdrop-blur-xl">
          {/* Hero */}
          <div className="hidden lg:block lg:w-[58%]">
            <Hero />
          </div>

          {/* Login */}
          <div className="relative flex w-full items-center justify-center bg-transparent px-3 py-6 sm:px-6 sm:py-10 lg:w-[42%] lg:px-12">
            <div className="relative w-full max-w-[560px] rounded-2xl sm:rounded-[36px] lg:rounded-[42px] border border-white/60 bg-gradient-to-br from-white/72 via-white/58 to-white/45 p-5 sm:p-8 md:p-10 lg:p-12 backdrop-blur-[55px] shadow-[0_35px_120px_rgba(15,40,60,.10)]">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}