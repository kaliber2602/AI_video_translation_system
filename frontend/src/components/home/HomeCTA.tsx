import {CheckCircle2 } from "lucide-react";
import {useNavigate} from "react-router-dom";

export default function HomeCTA() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-white px-5 pb-12 pt-16 lg:px-8 lg:pt-20">
      {/* Decorative waves */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[180px] w-[420px] opacity-60">
        <div className="absolute bottom-0 left-[-100px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[8deg]" />
        <div className="absolute bottom-[-20px] left-[-80px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[8deg]" />
        <div className="absolute bottom-[-40px] left-[-60px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[8deg]" />
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 h-[180px] w-[420px] opacity-60">
        <div className="absolute bottom-0 right-[-100px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[-8deg]" />
        <div className="absolute bottom-[-20px] right-[-80px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[-8deg]" />
        <div className="absolute bottom-[-40px] right-[-60px] h-[100px] w-[500px] rounded-[50%] border-t border-[#BCEDE4] rotate-[-8deg]" />
      </div>

      <div className="relative mx-auto max-w-[700px] text-center">
        <h2 className="text-3xl font-black tracking-[-1px] text-[#172238] sm:text-4xl">
          Sẵn sàng biến video thành{" "}
          <span className="text-[#18BFA7]">
            tri thức?
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-[520px] text-sm leading-6 text-[#829196]">
          Tham gia ngay để trải nghiệm sức mạnh của AI trong
          dịch thuật, lồng tiếng và khai thác tri thức từ video.
        </p>

        <button
          onClick={() => navigate("/register")}
          className="flex items-center gap-2 rounded-xl bg-[#20C5AE] px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(32,197,174,0.25)] transition hover:-translate-y-0.5 hover:bg-[#12B49D]"
        >
          Bắt đầu miễn phí
          <span>→</span>
        </button>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#78888D]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#18BFA7]" />
            Miễn phí 7 ngày
          </span>

          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#18BFA7]" />
            Không cần thẻ tín dụng
          </span>

          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#18BFA7]" />
            Hủy bất cứ lúc nào
          </span>
        </div>
      </div>
    </section>
  );
}