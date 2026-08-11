import {
  Moon,
  Sun,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function HomeNavbar() {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleThemeToggle = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E7EFED]/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-5 lg:px-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-[#7657F6]" />
            <div className="absolute left-1 top-4 h-2 w-2 rounded-full bg-[#7657F6]" />
            <div className="absolute left-0 top-7 h-2 w-2 rounded-full bg-[#7657F6]" />

            <div className="absolute left-3 top-2 h-[2px] w-7 rotate-[-20deg] bg-[#7657F6]" />
            <div className="absolute left-3 top-5 h-[2px] w-7 bg-[#7657F6]" />
            <div className="absolute left-3 top-7 h-[2px] w-7 rotate-[20deg] bg-[#7657F6]" />
          </div>

          <div className="leading-none">
            <div className="text-[18px] font-black tracking-[0.16em] text-[#182238]">
              VIDNOVA
            </div>

            <div className="mt-1 text-[8px] font-bold tracking-[0.4em] text-[#18BFA7]">
              SINCE 2026
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          <a
            href="#home"
            className="relative py-2 text-sm font-semibold text-[#18BFA7]"
          >
            Trang chủ
            <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-[#18BFA7]" />
          </a>

          <a
            href="#features"
            className="py-2 text-sm font-medium text-[#4D5B62] transition hover:text-[#18BFA7]"
          >
            Tính năng
          </a>

          <a
            href="#solutions"
            className="py-2 text-sm font-medium text-[#4D5B62] transition hover:text-[#18BFA7]"
          >
            Giải pháp
          </a>

          <a
            href="#pricing"
            className="py-2 text-sm font-medium text-[#4D5B62] transition hover:text-[#18BFA7]"
          >
            Bảng giá
          </a>

          <a
            href="#resources"
            className="py-2 text-sm font-medium text-[#4D5B62] transition hover:text-[#18BFA7]"
          >
            Tài nguyên
          </a>

          <a
            href="#about"
            className="py-2 text-sm font-medium text-[#4D5B62] transition hover:text-[#18BFA7]"
          >
            Về chúng tôi
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">

          <button
            onClick={handleThemeToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#66757A] transition hover:bg-[#F1F8F6] hover:text-[#18BFA7]"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link
            to="/login"
            className="hidden h-10 items-center justify-center rounded-xl border border-[#DCE7E5] bg-white px-5 text-sm font-semibold text-[#43535A] transition hover:border-[#18BFA7] hover:text-[#18BFA7] sm:flex"
          >
            Đăng nhập
          </Link>

          <button
            onClick={() => navigate("/register")}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#18C3AA] px-4 text-sm font-semibold text-white shadow-[0_7px_20px_rgba(24,195,170,0.22)] transition hover:-translate-y-0.5 hover:bg-[#11B39D]"
          >
            Bắt đầu ngay
            <span>→</span>
          </button>
        </div>
      </div>
    </header>
  );
}