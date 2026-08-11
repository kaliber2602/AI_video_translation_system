import {
  FileText,
  MoreHorizontal,
  Play,
  Settings2,
} from "lucide-react";

type VideoStatus =
  | "completed"
  | "editing"
  | "processing"
  | "draft";

type Video = {
  id: number;
  title: string;
  filename: string;
  duration: string;
  size: string;
  updated: string;
  status: VideoStatus;
};

type VideoCardProps = {
  video: Video;
  onOpen: () => void;
};

const statusConfig: Record<
  VideoStatus,
  {
    label: string;
    className: string;
  }
> = {
  completed: {
    label: "Completed",
    className: "bg-[#E4F8F2] text-[#16A88F]",
  },

  editing: {
    label: "Needs Review",
    className: "bg-[#FFF2D8] text-[#C68A1C]",
  },

  processing: {
    label: "Processing",
    className: "bg-[#EAF1FF] text-[#5783D4]",
  },

  draft: {
    label: "Draft",
    className: "bg-[#F0F2F3] text-[#738187]",
  },
};

export default function VideoCard({
  video,
  onOpen,
}: VideoCardProps) {
  const status = statusConfig[video.status];

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#E4ECEB] bg-white shadow-[0_10px_35px_rgba(30,70,80,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(30,70,80,0.09)]">
      {/* ================= Thumbnail ================= */}

      <div className="relative h-[190px] overflow-hidden bg-gradient-to-br from-[#15212B] via-[#334854] to-[#78919A]">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,189,0.3),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.14),transparent_30%)]" />

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${video.title}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#18BFA7] shadow-xl transition hover:scale-110 hover:bg-white"
          >
            <Play
              size={22}
              fill="currentColor"
            />
          </button>
        </div>

        {/* Duration */}
        <div className="absolute bottom-4 left-4 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
          {video.duration}
        </div>

        {/* More Button */}
        <div className="absolute right-4 top-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label="More options"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/25 text-white backdrop-blur-md transition hover:bg-black/45"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* ================= Content ================= */}

      <div className="p-5">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-[#263641]">
              {video.title}
            </h2>

            <p className="mt-1 truncate text-xs text-[#8A999D]">
              {video.filename}
            </p>
          </div>

          {/* Status */}
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Metadata */}
        <div className="mt-5 flex items-center justify-between border-t border-[#EDF2F1] pt-4 text-xs text-[#829196]">
          <span>{video.size}</span>

          <span>{video.updated}</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          {/* Open Pipeline */}
          <button
            type="button"
            onClick={onOpen}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E8F9F5] py-2.5 text-xs font-semibold text-[#13BDA5] transition hover:bg-[#D9F5EF]"
          >
            <Settings2 size={15} />

            {video.status === "completed"
              ? "Review Video"
              : video.status === "editing"
                ? "Continue Editing"
                : video.status === "processing"
                  ? "View Progress"
                  : "Open Pipeline"}
          </button>

          {/* Documents */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label="View generated documents"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3EBEA] text-[#7D8D91] transition hover:border-[#18C3AA] hover:text-[#18BFA7]"
          >
            <FileText size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}