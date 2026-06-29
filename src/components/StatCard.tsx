type StatCardProps = {
  label: string;
  value: number;
  tone?: "default" | "accent" | "warn";
};

const toneClassMap = {
  default: "border-white/10 bg-white/5 text-slate-100",
  accent: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
  warn: "border-amber-400/25 bg-amber-400/10 text-amber-100",
};

export default function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-4 sm:px-4 ${toneClassMap[tone]}`}>
      <p className="whitespace-nowrap text-[11px] leading-5 text-slate-400 sm:text-xs">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}
