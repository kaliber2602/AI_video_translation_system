import {
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import HomeProductPreview from "./HomeProductPreview";


export default function HomeHero() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-100px] top-[-180px] h-[500px] w-[500px] rounded-full bg-[#DDF9F3] opacity-60 blur-3xl" />

        <div className="absolute left-[-180px] top-[350px] h-[400px] w-[400px] rounded-full bg-[#EEF4FF] opacity-70 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-24">

        {/* Left */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8F2EC] bg-[#F1FBF8] px-3 py-1.5 text-xs font-semibold text-[#18A991]">
            <Sparkles size={13} />
            AI Video Translator & Knowledge Suite
          </div>

          <h1 className="max-w-[650px] text-[42px] font-black leading-[1.08] tracking-[-1.8px] text-[#121D31] sm:text-[52px] lg:text-[58px]">
            Biến mọi video thành{" "}
            <span className="text-[#18BFA7]">
              tri thức
            </span>{" "}
            giá trị
          </h1>

          <p className="mt-6 max-w-[580px] text-base leading-7 text-[#68787E] sm:text-lg">
            Dịch video, lồng tiếng, tạo phụ đề và trích xuất
            kiến thức thông minh. Tất cả trong một nền tảng AI
            mạnh mẽ.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="flex h-12 items-center gap-2 rounded-xl bg-[#18C3AA] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(24,195,170,0.25)] transition hover:-translate-y-0.5 hover:bg-[#11B39D]"
            >
            Bắt đầu miễn phí
            <span>→</span>
            </button>

            <a
              href="#features"
              className="flex h-12 items-center gap-2 rounded-xl border border-[#DDE8E6] bg-white px-5 text-sm font-bold text-[#415159] transition hover:border-[#18C3AA] hover:text-[#18BFA7]"
            >
              Xem demo
              <PlayCircle size={17} />
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["A", "N", "M", "T"].map((letter) => (
                <div
                  key={letter}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#D7ECE8] to-[#789A95] text-xs font-bold text-white"
                >
                  {letter}
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] text-[#849296]">
                Được tin dùng bởi 10,000+ người dùng và đội nhóm
              </p>

              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm tracking-[2px] text-[#18C3AA]">
                  ★★★★★
                </span>

                <span className="text-[10px] font-semibold text-[#718387]">
                  5.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <HomeProductPreview />
      </div>
    </section>
  );
}