export function BrandMark({ size = "default" }: { size?: "default" | "small" }) {
  const boxSize = size === "small" ? "h-[34px] w-[34px] text-[13px]" : "h-11 w-11 text-[17px]";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid flex-none place-items-center border-2 border-silver font-display font-extrabold tracking-wide text-silver-hi ${boxSize}`}
        style={{
          backgroundImage: "linear-gradient(145deg, color-mix(in srgb, var(--silver) 22%, transparent), transparent)",
        }}
      >
        BB
      </div>
      <div>
        <div className="font-display text-[17px] font-bold tracking-tight">Bhatia Brothers</div>
        <div className="text-[12px] uppercase tracking-[0.12em] opacity-70">Staff portal</div>
      </div>
    </div>
  );
}
