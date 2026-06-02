type KpiCardProps = {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const toneClass = {
  neutral: "border-line",
  good: "border-leaf/30",
  warning: "border-amber/50",
  danger: "border-coral/40"
};

export function KpiCard({ label, value, note, tone = "neutral" }: KpiCardProps) {
  return (
    <section className={`rounded-app border bg-white p-4 shadow-soft ${toneClass[tone]}`}>
      <span className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</span>
      <strong className="mt-2 block text-2xl leading-tight">{value}</strong>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
    </section>
  );
}
