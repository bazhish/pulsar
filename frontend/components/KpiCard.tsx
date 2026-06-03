type KpiCardProps = {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const toneClass = {
  neutral: "border-white/80 from-white to-sky/5",
  good: "border-leaf/20 from-white to-leaf/10",
  warning: "border-amber/30 from-white to-amber/15",
  danger: "border-coral/25 from-white to-coral/10"
};

const markerClass = {
  neutral: "bg-sky",
  good: "bg-leaf",
  warning: "bg-amber",
  danger: "bg-coral"
};

export function KpiCard({ label, value, note, tone = "neutral" }: KpiCardProps) {
  return (
    <section 
      className={`relative overflow-hidden rounded-app border bg-gradient-to-br p-4 shadow-soft select-none ${toneClass[tone]}`}
      role="status"
      aria-label={`${label}: ${value}${note ? ` (${note})` : ""}`}
    >
      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${markerClass[tone]}`} />
      <span className="text-xs font-bold uppercase tracking-normal text-muted">{label}</span>
      <strong className="metric-number mt-2 block text-2xl leading-tight">{value}</strong>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
    </section>
  );
}
