import { Captions, Check, Download } from "lucide-react";

export default function SubtitleStep() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#18BFA7]">Step 05 of 06</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">Create Subtitles</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
          Customize subtitle format and preview the translated subtitles before exporting.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
        <div className="flex items-center justify-between border-b border-[#EDF2F1] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
              <Captions size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#263641]">Subtitle Preview</h3>
              <p className="mt-1 text-xs text-[#8A999D]">Vietnamese subtitles</p>
            </div>
          </div>

          <button className="flex items-center gap-2 rounded-xl border border-[#E1EBE9] px-4 py-2.5 text-xs font-semibold text-[#53666B]">
            <Download size={15} />
            Download SRT
          </button>
        </div>

        <div className="mt-6 flex aspect-video items-end justify-center rounded-2xl bg-[#1B2932] p-8">
          <div className="rounded-lg bg-black/70 px-5 py-3 text-center text-base font-medium text-white">
            Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-[#53666B]">
            Format
            <select className="mt-2 h-11 w-full rounded-xl border border-[#E4ECEB] px-3 text-sm">
              <option>SRT</option>
              <option>VTT</option>
              <option>ASS</option>
            </select>
          </label>

          <label className="text-sm text-[#53666B]">
            Font Size
            <select className="mt-2 h-11 w-full rounded-xl border border-[#E4ECEB] px-3 text-sm">
              <option>Medium</option>
              <option>Large</option>
              <option>Small</option>
            </select>
          </label>

          <label className="text-sm text-[#53666B]">
            Position
            <select className="mt-2 h-11 w-full rounded-xl border border-[#E4ECEB] px-3 text-sm">
              <option>Bottom Center</option>
              <option>Top Center</option>
            </select>
          </label>
        </div>

        <button className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#18BFA7]">
          <Check size={17} />
          Subtitle settings saved
        </button>
      </div>
    </div>
  );
}