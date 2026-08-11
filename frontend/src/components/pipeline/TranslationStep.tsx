import { Languages, Save, Sparkles } from "lucide-react";

export default function TranslationStep() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#18BFA7]">Step 03 of 06</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">Review Translation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
          Review and refine the translated content before continuing to voice generation and subtitle creation.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EDF2F1] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
              <Languages size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#263641]">Translation Editor</h3>
              <p className="mt-1 text-xs text-[#8A999D]">English → Vietnamese</p>
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-xl border border-[#E1EBE9] px-4 py-2.5 text-xs font-semibold text-[#53666B] transition hover:border-[#18C3AA] hover:text-[#18BFA7]">
            <Sparkles size={15} />
            Re-translate
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8A999D]">
                Original Transcript
              </label>

              <textarea
                defaultValue="Natural language processing is a field of artificial intelligence that focuses on the interaction between computers and human language."
                className="min-h-[190px] w-full resize-none rounded-xl border border-[#E4ECEB] bg-[#FAFCFB] p-4 text-sm leading-6 text-[#53666B] outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8A999D]">
                Vietnamese Translation
              </label>

              <textarea
                defaultValue="Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo, tập trung vào sự tương tác giữa máy tính và ngôn ngữ của con người."
                className="min-h-[190px] w-full resize-none rounded-xl border border-[#BFE9E0] bg-[#F5FCFA] p-4 text-sm leading-6 text-[#263641] outline-none transition focus:border-[#18C3AA] focus:ring-4 focus:ring-[#18C3AA]/10"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[#EDF2F1] pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-[#8A999D]">
            Changes are automatically saved as a draft.
          </p>

          <button className="flex items-center justify-center gap-2 rounded-xl bg-[#18C3AA] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)]">
            <Save size={16} />
            Save Translation
          </button>
        </div>
      </div>
    </div>
  );
}