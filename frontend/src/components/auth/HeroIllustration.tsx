import {
  FileAudio,
  Languages,
  FileText,
  Search,
  LayoutDashboard,
  FolderKanban,
  Database,
  Files,
  Bot,
  Settings,
  Play,
  Volume2,
  Maximize2,
} from "lucide-react";
import imagePreview from "../../assets/hero.jpg";
import logoTopbar from "../../assets/logo-topbar.png";

export default function HeroIllustration() {
  return (
    <div
      className="relative h-[430px] w-full select-none"
      style={{
        perspective: "1000px",
        perspectiveOrigin: "60% 50%",
        transformStyle: "preserve-3d",
      }}
    >
      {/* ========================================================
          1. LEFT SIDEBAR (Layer 1 - Lùi sâu về phía sau)
          transform: perspective(1000px) rotateY(14deg) rotateX(2deg) translateZ(-70px)
          Tạo góc vát mở và lùi sâu so với khung video
      ======================================================== */}
      <div
        style={{
          transform: "perspective(1000px) rotateY(14deg) rotateX(2deg) translateZ(-70px)",
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
        }}
        className="absolute left-0 top-6 h-[320px] w-[142px] rounded-[24px] bg-white p-3.5 shadow-[12px_28px_55px_-10px_rgba(0,0,0,0.22),4px_12px_22px_-5px_rgba(0,0,0,0.12)] border border-slate-100/90 z-10 flex flex-col justify-between transition-transform duration-300 hover:rotateY(10deg)"
      >
        <div>
          {/* Top Brand Logo */}
          <div className="flex items-center gap-1.5 px-1 py-1 mb-3 border-b border-slate-100 pb-2.5">
            <img
              src={logoTopbar}
              alt="VIDNOVA"
              className="h-5 w-auto object-contain"
            />
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            <SidebarItem
              icon={<LayoutDashboard size={13} />}
              label="Dashboard"
              active
            />
            <SidebarItem
              icon={<FolderKanban size={13} />}
              label="Projects"
            />
            <SidebarItem
              icon={<Database size={13} />}
              label="Knowledge Search"
            />
            <SidebarItem
              icon={<Files size={13} />}
              label="Documents"
            />
            <SidebarItem
              icon={<Bot size={13} />}
              label="AI Assistant"
            />
          </div>
        </div>

        {/* Bottom Settings */}
        <div className="pt-2 border-t border-slate-100">
          <SidebarItem
            icon={<Settings size={13} />}
            label="Settings"
          />
        </div>
      </div>

      {/* ========================================================
          2. MAIN SCREEN / VIDEO WINDOW (Layer 2 - Vát nghiêng sang phải)
          transform: perspective(1000px) rotateY(12deg) rotateX(2deg)
          Bên trái lùi sâu về phía sidebar, bên phải nhô ra trước
      ======================================================== */}
      <div
        style={{
          transform: "perspective(1000px) rotateY(12deg) rotateX(2deg)",
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
        }}
        className="absolute left-24 top-2 h-[340px] w-[560px] rounded-[24px] bg-white shadow-[20px_35px_70px_-15px_rgba(0,0,0,0.28),8px_18px_35px_-8px_rgba(0,0,0,0.14)] border border-slate-100/90 overflow-hidden z-20 flex flex-col transition-transform duration-300 hover:rotateY(8deg)"
      >
        {/* macOS Window Top Bar */}
        <div className="flex h-11 items-center justify-between px-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] shadow-xs" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E] shadow-xs" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840] shadow-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 font-mono tracking-tight">vidnova_pipeline_v2.mp4</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Full Video Player Display */}
        <div className="relative flex-1 w-full bg-slate-950 overflow-hidden group">
          {/* Real video presenter thumbnail */}
          <img
            src={imagePreview}
            alt="AI Video Translation"
            className="h-full w-full object-cover object-center opacity-95 transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Subtitle Overlay: "Turning video content into valuable knowledge" */}
          <div className="absolute inset-x-6 bottom-12 flex justify-center pointer-events-none">
            <div className="rounded-xl bg-black/65 px-4 py-1.5 text-center backdrop-blur-md border border-white/15 shadow-2xl max-w-[90%]">
              <p className="text-xs font-medium text-white tracking-wide leading-snug">
                &ldquo;Turning video content into valuable knowledge&rdquo;
              </p>
            </div>
          </div>

          {/* Video Control Timeline Bar (02:15 / 10:30) */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-3 pt-6 flex flex-col gap-2">
            {/* Timeline progress line */}
            <div className="relative h-1 w-full rounded-full bg-white/25 overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[42%] rounded-full bg-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
            </div>

            {/* Playback Controls & Indicators */}
            <div className="flex items-center justify-between text-[10px] text-white/95">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                >
                  <Play size={10} className="fill-white ml-0.5" />
                </button>
                <div className="flex items-center gap-1.5">
                  <Volume2 size={12} className="text-white/80" />
                  <span className="font-mono text-[10px] font-medium tracking-tight">02:15 / 10:30</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="rounded bg-[#14B8A6] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider shadow-xs">
                  AI DUBBED
                </span>
                <Maximize2 size={12} className="text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. FLOATING FEATURE CARDS (Layer 3 - Highest Z-Index: 50)
          Nằm ở lớp trên cùng (highest z-index), không bị che khuất
          Bóng đổ mềm nghiêng theo góc phối cảnh mới
      ======================================================== */}
      {/* 1. Transcribe */}
      <FloatingCard
        icon={<FileAudio size={18} className="text-[#14B8A6]" />}
        iconBg="bg-[#14B8A6]/10"
        title="Transcribe"
        subtitle="Speech to Text"
        top="14px"
        right="8px"
      />

      {/* 2. Translate */}
      <FloatingCard
        icon={<Languages size={18} className="text-[#0EA5E9]" />}
        iconBg="bg-[#0EA5E9]/10"
        title="Translate"
        subtitle="150+ Languages"
        top="102px"
        right="-22px"
      />

      {/* 3. Summarize */}
      <FloatingCard
        icon={<FileText size={18} className="text-[#8B5CF6]" />}
        iconBg="bg-[#8B5CF6]/10"
        title="Summarize"
        subtitle="AI Key Insights"
        top="190px"
        right="6px"
      />

      {/* 4. Search Knowledge */}
      <FloatingCard
        icon={<Search size={18} className="text-emerald-600" />}
        iconBg="bg-emerald-50"
        title="Search Knowledge"
        subtitle="Semantic Vector"
        top="278px"
        right="-26px"
      />
    </div>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================

function SidebarItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition ${
        active
          ? "bg-[#14B8A6]/15 text-[#0f766e] font-bold shadow-xs"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >
      <span className={active ? "text-[#14B8A6]" : "text-slate-400"}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function FloatingCard({
  icon,
  iconBg,
  title,
  subtitle,
  top,
  right,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  top: string;
  right: string;
}) {
  return (
    <div
      style={{
        top,
        right,
        transform: "translateZ(80px)",
      }}
      className="absolute flex items-center gap-3 rounded-[16px] bg-white px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] border border-slate-100/90 z-50 min-w-[175px] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.08)] duration-200"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800 leading-tight">
          {title}
        </h4>
        <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}