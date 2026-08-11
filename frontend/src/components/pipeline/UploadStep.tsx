import { useState } from "react";
import {
  CheckCircle2,
  FileVideo,
  Languages,
  UploadCloud,
} from "lucide-react";

export default function UploadStep() {
  const [targetLanguage, setTargetLanguage] = useState("vi");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#18BFA7]">
          Step 01 of 06
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[#152238]">
          Upload Video
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718387]">
          Upload your video and choose the language you want to translate it
          into. The original language will be detected automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#BFE9E0] bg-[#F8FDFC] p-8 text-center transition hover:border-[#18C3AA] hover:bg-[#F2FBF9]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5F9F4] text-[#18BFA7]">
            <UploadCloud size={30} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-[#263641]">
            Drop your video here
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-[#8A999D]">
            Upload MP4, MOV, MKV, AVI or other supported video formats.
          </p>

          <button className="mt-6 rounded-xl bg-[#18C3AA] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[#12B49D]">
            Browse Files
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#E8EFED] bg-[#FBFDFC] p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#5E83D6]">
            <FileVideo size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#53666B]">
              nlp-introduction.mp4
            </p>

            <p className="mt-1 text-xs text-[#9AA7AA]">
              820 MB · Uploaded
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E4ECEA]">
              <div className="h-full w-full rounded-full bg-[#18C3AA]" />
            </div>
          </div>

          <CheckCircle2 size={20} className="text-[#18BFA7]" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E3ECEA] bg-white p-6 shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#18BFA7]">
            <Languages size={19} />
          </div>

          <div>
            <h3 className="text-base font-bold text-[#263641]">
              Translation Language
            </h3>

            <p className="mt-1 text-xs text-[#8A999D]">
              The original language will be detected automatically.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[#53666B]">
            Translate To
          </label>

          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="h-12 w-full rounded-xl border border-[#BFE9E0] bg-[#F5FCFA] px-4 text-sm text-[#53666B] outline-none transition focus:border-[#18C3AA] focus:ring-4 focus:ring-[#18C3AA]/10"
          >
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
          </select>

          <p className="mt-2 text-xs text-[#9AA7AA]">
            Select the language you want the video content to be translated
            into.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#D9F1EB] bg-[#F4FCFA] p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DDF8F0] text-[#18BFA7]">
            <Languages size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#53666B]">
              Automatic language detection enabled
            </p>

            <p className="mt-1 text-xs text-[#8A999D]">
              The system will automatically identify the spoken language in your
              video.
            </p>
          </div>
        </div>

        <button className="mt-6 w-full rounded-xl bg-[#18C3AA] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[#12B49D]">
          Continue to Processing
        </button>
      </div>
    </div>
  );
}