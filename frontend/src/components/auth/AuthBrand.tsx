export default function AuthBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[#B9D9D4] bg-white/50 text-[10px] font-medium text-[#8CA5A3]">
        LOGO
        {/* <img
        src="/logo.png"
        alt="VidNova"
        className="h-12 w-12 object-contain"
        /> */}
      </div>

      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#142238]">
          VIDNOVA
        </h1>

        <p className="text-[10px] font-semibold tracking-[5px] text-[#16BFA9]">
          SINCE 2026
        </p>
      </div>
    </div>
  );
}