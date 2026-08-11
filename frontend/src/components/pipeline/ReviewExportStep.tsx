import {
  Check,
  ChevronLeft,
  Download,
  FileAudio,
  FileText,
  Film,
  GripVertical,
  Play,
  Save,
  Settings2,
  Volume2,
} from "lucide-react";

const timelineTracks = [
  {
    id: "video",
    label: "Video",
    icon: Film,
    color: "bg-[#DDF5F0]",
    iconColor: "text-[#18BFA7]",
    blocks: [
      {
        label: "Original Video",
        start: "0%",
        width: "100%",
      },
    ],
  },
  {
    id: "subtitle",
    label: "Subtitle",
    icon: FileText,
    color: "bg-[#E9F0FF]",
    iconColor: "text-[#6688D8]",
    blocks: [
      {
        label: "Hello everyone",
        start: "0%",
        width: "20%",
      },
      {
        label: "Welcome to NLP",
        start: "23%",
        width: "25%",
      },
      {
        label: "Today we learn...",
        start: "53%",
        width: "35%",
      },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    icon: Volume2,
    color: "bg-[#FFF1DE]",
    iconColor: "text-[#D99A45]",
    blocks: [
      {
        label: "AI Voice Over",
        start: "0%",
        width: "100%",
      },
    ],
  },
  {
    id: "translation",
    label: "Translation",
    icon: FileText,
    color: "bg-[#F1E8FF]",
    iconColor: "text-[#9A6DD7]",
    blocks: [
      {
        label: "Translation 01",
        start: "0%",
        width: "20%",
      },
      {
        label: "Translation 02",
        start: "23%",
        width: "25%",
      },
      {
        label: "Translation 03",
        start: "53%",
        width: "35%",
      },
    ],
  },
];

export default function ReviewExportStep() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#18BFA7]">
            Step 06 of 06
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">
            Review & Export
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
            Review your processed video, adjust the timeline, and select the
            files you want to export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#DCEAE7] bg-white px-4 py-2.5 text-xs font-medium text-[#7E9092]">
            <Check size={15} className="text-[#18BFA7]" />
            Saved just now
          </div>

          <button className="flex items-center gap-2 rounded-xl border border-[#DCEAE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#53666B] transition hover:border-[#18C3AA] hover:text-[#18BFA7]">
            <Save size={16} />
            Save
          </button>
        </div>
      </div>

      {/* Main Preview + Export Options */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Video Preview */}
        <div className="overflow-hidden rounded-2xl border border-[#E3ECEA] bg-[#17252B] shadow-[0_10px_35px_rgba(30,70,80,0.06)]">
          <div className="relative flex aspect-video items-center justify-center bg-[#1D2D33]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,95,0.4),transparent_65%)]" />

            <button className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#18BFA7] shadow-[0_10px_35px_rgba(0,0,0,0.2)] transition hover:scale-105">
              <Play size={26} fill="currentColor" />
            </button>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[32%] rounded-full bg-[#18C3AA]" />
              </div>

              <div className="flex items-center justify-between text-xs text-white/80">
                <span>00:12</span>
                <span>12:45</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-white">
            <div className="flex items-center gap-4">
              <button className="transition hover:text-[#5DE0C9]">
                <Play size={18} fill="currentColor" />
              </button>

              <span className="text-sm font-medium text-white/70">
                nlp-introduction.mp4
              </span>
            </div>

            <div className="flex items-center gap-4 text-white/60">
              <Volume2 size={17} />
              <Settings2 size={17} />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <ExportOptions />
      </div>

      {/* Timeline */}
      <TimelineEditor />

      {/* Bottom Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E3ECEA] bg-white p-5 sm:flex-row sm:items-center">
        <button className="flex items-center justify-center gap-2 rounded-xl border border-[#DCEAE7] px-5 py-3 text-sm font-semibold text-[#53666B] transition hover:border-[#18C3AA] hover:text-[#18BFA7]">
          <ChevronLeft size={17} />
          Back to Editing
        </button>

        <button className="flex items-center justify-center gap-2 rounded-xl bg-[#18C3AA] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[#12B49D]">
          <Download size={17} />
          Export Selected Files
        </button>
      </div>
    </div>
  );
}

function ExportOptions() {
  return (
    <div className="rounded-2xl border border-[#E3ECEA] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
          <Download size={18} />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#263641]">
            Export Options
          </h3>

          <p className="mt-1 text-xs text-[#8A999D]">
            Select the outputs you need.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ExportCheckbox
          label="Final Video"
          description="Processed video with translation"
          checked
          icon={<Film size={16} />}
        />

        <ExportCheckbox
          label="Subtitle File"
          description="SRT or VTT subtitle file"
          checked
          icon={<FileText size={16} />}
        />

        <ExportCheckbox
          label="Audio File"
          description="Generated dubbed audio"
          icon={<FileAudio size={16} />}
        />

        <ExportCheckbox
          label="Transcript"
          description="Original transcript text"
          icon={<FileText size={16} />}
        />

        <ExportCheckbox
          label="Translation"
          description="Translated text document"
          icon={<FileText size={16} />}
        />
      </div>

      <div className="mt-5 border-t border-[#EDF2F1] pt-5">
        <label className="mb-2 block text-xs font-semibold text-[#718387]">
          Video Format
        </label>

        <select className="h-11 w-full rounded-xl border border-[#E3ECEA] bg-[#FBFDFC] px-3 text-sm text-[#53666B] outline-none focus:border-[#18C3AA]">
          <option>MP4</option>
          <option>MKV</option>
          <option>MOV</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold text-[#718387]">
          Quality
        </label>

        <select className="h-11 w-full rounded-xl border border-[#E3ECEA] bg-[#FBFDFC] px-3 text-sm text-[#53666B] outline-none focus:border-[#18C3AA]">
          <option>1080p</option>
          <option>720p</option>
          <option>4K</option>
        </select>
      </div>
    </div>
  );
}

function ExportCheckbox({
  label,
  description,
  checked = false,
  icon,
}: {
  label: string;
  description: string;
  checked?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#EDF2F1] p-3 transition hover:border-[#BFE9E0] hover:bg-[#F8FDFC]">
      <input
        type="checkbox"
        defaultChecked={checked}
        className="mt-1 h-4 w-4 accent-[#18C3AA]"
      />

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F7F5] text-[#6F8586]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#53666B]">{label}</p>

        <p className="mt-0.5 text-[11px] leading-4 text-[#9AA7AA]">
          {description}
        </p>
      </div>
    </label>
  );
}

function TimelineEditor() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E3ECEA] bg-white">
      <div className="flex items-center justify-between border-b border-[#EDF2F1] px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-[#263641]">
            Timeline Editor
          </h3>

          <p className="mt-1 text-xs text-[#8A999D]">
            Review and adjust your processed content.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-[#E3ECEA] px-3 py-2 text-xs font-semibold text-[#718387] transition hover:border-[#18C3AA] hover:text-[#18BFA7]">
          <Settings2 size={14} />
          Timeline Settings
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px] p-5">
          <div className="ml-[150px] mb-4 flex justify-between text-[11px] text-[#9AA7AA]">
            <span>00:00</span>
            <span>00:30</span>
            <span>01:00</span>
            <span>01:30</span>
            <span>02:00</span>
            <span>02:30</span>
          </div>

          <div className="space-y-3">
            {timelineTracks.map((track) => {
              const Icon = track.icon;

              return (
                <div key={track.id} className="flex items-center gap-4">
                  <div className="flex w-[130px] shrink-0 items-center gap-2">
                    <Icon size={16} className={track.iconColor} />

                    <span className="text-sm font-semibold text-[#53666B]">
                      {track.label}
                    </span>
                  </div>

                  <div className="relative h-14 flex-1 rounded-xl bg-[#F5F8F7]">
                    <div className="absolute inset-y-0 left-[32%] z-20 w-[2px] bg-[#18C3AA]">
                      <div className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-[#18C3AA]" />
                    </div>

                    {track.blocks.map((block, index) => (
                      <div
                        key={`${track.id}-${index}`}
                        className={`absolute top-2 flex h-10 items-center gap-2 rounded-lg px-3 ${track.color} cursor-grab transition hover:brightness-95 active:cursor-grabbing`}
                        style={{
                          left: block.start,
                          width: block.width,
                        }}
                      >
                        <GripVertical
                          size={14}
                          className="shrink-0 text-[#7E9092]"
                        />

                        <span className="truncate text-xs font-semibold text-[#53666B]">
                          {block.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}