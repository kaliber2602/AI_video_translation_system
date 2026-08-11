import { Mic2, Play, Volume2 } from "lucide-react";

export default function DubbingStep() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#18BFA7]">Step 04 of 06</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">Generate Dubbing</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
          Select a voice and generate translated audio for your video.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
          <div className="flex items-center gap-3 border-b border-[#EDF2F1] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
              <Mic2 size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#263641]">Voice Settings</h3>
              <p className="mt-1 text-xs text-[#8A999D]">Vietnamese voice generation</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#53666B]">
                Voice
              </label>

              <select className="h-11 w-full rounded-xl border border-[#E4ECEB] bg-white px-4 text-sm text-[#53666B] outline-none focus:border-[#18C3AA]">
                <option>Vietnamese Female — Natural</option>
                <option>Vietnamese Male — Professional</option>
                <option>Vietnamese Female — Energetic</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#53666B]">
                Speaking Style
              </label>

              <select className="h-11 w-full rounded-xl border border-[#E4ECEB] bg-white px-4 text-sm text-[#53666B] outline-none focus:border-[#18C3AA]">
                <option>Natural</option>
                <option>Professional</option>
                <option>Energetic</option>
                <option>Calm</option>
              </select>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18C3AA] py-3 text-sm font-semibold text-white">
              <Volume2 size={17} />
              Generate Voice
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E3ECEA] bg-[#17232D] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9CAEB4]">
            Audio Preview
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18C3AA]">
              <Play size={19} fill="currentColor" />
            </button>

            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[38%] rounded-full bg-[#18C3AA]" />
              </div>

              <div className="mt-2 flex justify-between text-xs text-[#9CAEB4]">
                <span>00:04</span>
                <span>00:12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}