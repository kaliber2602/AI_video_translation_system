import {
  Check,
  FileText,
  MoreHorizontal,
  Play,
  Settings,
} from "lucide-react";

const processingSteps = [
  {
    label: "Đã tải lên",
    time: "09:20",
    completed: true,
  },
  {
    label: "Chuyển giọng nói",
    time: "09:21",
    completed: true,
  },
  {
    label: "Dịch thuật",
    time: "09:22",
    completed: true,
  },
  {
    label: "Lồng tiếng",
    time: "09:25",
    completed: true,
  },
  {
    label: "Trích xuất kiến thức",
    time: "09:28",
    completed: true,
  },
  {
    label: "Hoàn tất",
    time: "09:30",
    completed: true,
  },
];

const outputFiles = [
  {
    label: "SRT",
    className: "text-[#36AFA1] bg-[#E8F9F5]",
  },
  {
    label: "TXT",
    className: "text-[#657A83] bg-[#F0F4F4]",
  },
  {
    label: "DOCX",
    className: "text-[#527BD2] bg-[#EDF2FF]",
  },
  {
    label: "MD",
    className: "text-[#805FC7] bg-[#F1ECFF]",
  },
  {
    label: "PDF",
    className: "text-[#D45C5C] bg-[#FFF0F0]",
  },
];

export default function HomeProductPreview() {
  return (
    <div className="relative">

      {/* Glow */}
      <div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle,rgba(24,195,170,0.16),transparent_68%)] blur-xl" />

      <div className="relative overflow-hidden rounded-[24px] border border-[#E5EFED] bg-white p-4 shadow-[0_25px_80px_rgba(40,90,90,0.12)]">

        {/* App Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5FF]">
              <div className="h-4 w-4 rounded-full bg-[#7459F5]" />
            </div>

            <span className="text-[11px] font-black tracking-[0.15em] text-[#263641]">
              VIDNOVA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg p-1.5 text-[#819095] hover:bg-[#F5F9F8]">
              <Settings size={13} />
            </button>

            <button className="rounded-lg p-1.5 text-[#819095] hover:bg-[#F5F9F8]">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-4 md:grid-cols-[1fr_150px]">

          {/* Main video */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#263641]">
                  Giới thiệu về Trí tuệ nhân tạo
                </h3>

                <p className="mt-1 text-[9px] text-[#8B999D]">
                  AI Introduction.mp4
                </p>
              </div>

              <button className="rounded-lg border border-[#E4ECEB] px-2 py-1 text-[9px] text-[#718387]">
                Chia sẻ
              </button>
            </div>

            {/* Video */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#14201D] via-[#33483F] to-[#728C80]">

              {/* Simulated video background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.20),transparent_20%),linear-gradient(145deg,#15221E,#526C61)]" />

              {/* Person silhouette */}
              <div className="absolute bottom-[18%] left-1/2 h-[48%] w-[28%] -translate-x-1/2 rounded-[45%_45%_20%_20%] bg-gradient-to-b from-[#D7A27E] via-[#A86F54] to-[#3D3936]" />

              <div className="absolute left-1/2 top-[26%] h-[18%] w-[17%] -translate-x-1/2 rounded-full bg-[#D8A17C]" />

              {/* Subtitle */}
              <div className="absolute bottom-8 left-1/2 w-[90%] -translate-x-1/2 text-center text-[10px] font-medium text-white drop-shadow-md">
                Today, we'll explore the future
                <br />
                of artificial intelligence.
              </div>

              {/* Play */}
              <button className="absolute left-3 bottom-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#18BFA7]">
                <Play size={10} fill="currentColor" />
              </button>

              {/* Timeline */}
              <div className="absolute bottom-3 left-11 right-3">
                <div className="h-1 rounded-full bg-white/30">
                  <div className="h-full w-[17%] rounded-full bg-[#18C3AA]" />
                </div>
              </div>
            </div>
          </div>

          {/* Processing */}
          <div className="rounded-xl border border-[#EDF2F1] bg-[#FBFDFC] p-3">
            <h4 className="mb-3 text-[10px] font-bold text-[#53666B]">
              Quy trình xử lý
            </h4>

            <div className="space-y-3">
              {processingSteps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DDF8F1] text-[#18BFA7]">
                    <Check size={9} strokeWidth={3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[8px] font-semibold text-[#53666B]">
                      {step.label}
                    </p>
                  </div>

                  <span className="text-[7px] text-[#9AA7AA]">
                    {step.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output files */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {outputFiles.map((file) => (
            <div
              key={file.label}
              className="flex flex-col items-center justify-center rounded-xl border border-[#EDF2F1] bg-white py-3"
            >
              <div
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${file.className}`}
              >
                <FileText size={13} />
              </div>

              <span className="text-[8px] font-bold text-[#66757A]">
                {file.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}