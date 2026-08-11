import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProjectPagination() {
  return (
    <div className="mt-5 flex flex-col gap-4 px-1 text-sm text-[#7B8B90] sm:flex-row sm:items-center sm:justify-between">
      <span>Showing 1 to 7 of 7 items</span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1E9E8] text-[#C2CDCE] transition"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#18C3AA] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(24,195,170,0.2)]"
        >
          1
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1E9E8] text-[#7B8B90] transition hover:border-[#18C3AA] hover:text-[#18C3AA]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <span>Items per page</span>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[#E1E9E8] bg-white px-3 py-2 text-sm text-[#53666B] transition hover:border-[#18C3AA]"
        >
          10
          <ChevronRight size={14} className="rotate-90" />
        </button>
      </div>
    </div>
  );
}