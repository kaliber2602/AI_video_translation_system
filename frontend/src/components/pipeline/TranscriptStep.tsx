import { CheckCircle2, Download, FileText, Play } from "lucide-react";

export default function TranscriptStep() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#18BFA7]">Step 02 of 06</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">Review Transcript</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
          Review the automatically generated transcript and correct any recognition errors before translation.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[#E3ECEA] bg-[#17232D] p-5">
          <div className="flex aspect-video items-center justify-center rounded-xl bg-[#293B46]">
            <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#18BFA7] shadow-xl transition hover:scale-110">
              <Play size={22} fill="currentColor" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-white">NLP Introduction</p>
            <p className="mt-1 text-xs text-[#9CAEB4]">00:00:00 / 00:12:15</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
          <div className="flex items-center justify-between border-b border-[#EDF2F1] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
                <FileText size={19} />
              </div>

              <div>
                <h3 className="text-base font-bold text-[#263641]">Transcript</h3>
                <p className="mt-1 text-xs text-[#8A999D]">English · Auto-generated</p>
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-lg border border-[#E1EBE9] px-3 py-2 text-xs font-semibold text-[#53666B]">
              <Download size={14} />
              Export
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[#E9EFEE] bg-[#FBFDFC] p-4">
              <div className="mb-2 flex justify-between text-xs text-[#9AA7AA]">
                <span>00:00:00</span>
                <span>00:00:08</span>
              </div>

              <textarea
                defaultValue="Natural language processing is a field of artificial intelligence that focuses on the interaction between computers and human language."
                className="min-h-[130px] w-full resize-none bg-transparent text-sm leading-6 text-[#53666B] outline-none"
              />
            </div>

            <div className="rounded-xl border border-[#E9EFEE] bg-[#FBFDFC] p-4">
              <div className="mb-2 flex justify-between text-xs text-[#9AA7AA]">
                <span>00:00:09</span>
                <span>00:00:18</span>
              </div>

              <textarea
                defaultValue="This field combines computational linguistics with machine learning to understand and process human language."
                className="min-h-[100px] w-full resize-none bg-transparent text-sm leading-6 text-[#53666B] outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-[#16BFA7]">
            <CheckCircle2 size={16} />
            Transcript is ready for translation
          </div>
        </div>
      </div>
    </div>
  );
}