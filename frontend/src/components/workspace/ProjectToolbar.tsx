import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";

export default function ProjectToolbar() {
  return (
    <section className="mb-5 flex items-center gap-3 rounded-2xl border border-[#E5EFED] bg-white p-3 shadow-[0_8px_30px_rgba(30,70,80,0.04)]">
      <div className="relative min-w-0 flex-1">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91A3A7]"
        />

        <input
          type="text"
          placeholder="Search projects, videos, or keywords..."
          className="h-12 w-full rounded-xl border border-[#E4ECEB] bg-[#FBFDFC] pl-11 pr-4 text-sm text-[#152238] outline-none transition placeholder:text-[#9AA8AC] focus:border-[#20C5AE] focus:bg-white focus:ring-4 focus:ring-[#20C5AE]/10"
        />
      </div>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[#E4ECEB] bg-white px-5 text-sm text-[#53666B] transition hover:border-[#20C5AE] hover:bg-[#F4FBFA] md:flex">
        All Types
        <span className="text-[#8EA0A4]">⌄</span>
      </button>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[#E4ECEB] bg-white px-5 text-sm text-[#53666B] transition hover:border-[#20C5AE] hover:bg-[#F4FBFA] lg:flex">
        All Tags
        <span className="text-[#8EA0A4]">⌄</span>
      </button>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[#E4ECEB] bg-white px-5 text-sm text-[#53666B] transition hover:border-[#20C5AE] hover:bg-[#F4FBFA] xl:flex">
        Date Modified
        <span className="text-[#8EA0A4]">⌄</span>
      </button>

      <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E4ECEB] text-[#66787C] transition hover:border-[#20C5AE] hover:text-[#20BFA8]">
        <SlidersHorizontal size={18} />
      </button>

      <div className="hidden h-12 items-center rounded-xl border border-[#E4ECEB] p-1 sm:flex">
        <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E5F8F5] text-[#16BFA7]">
          <Grid2X2 size={18} />
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-lg text-[#718387] transition hover:bg-[#F3F8F7]">
          <List size={18} />
        </button>
      </div>
    </section>
  );
}