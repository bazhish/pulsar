type KpiCardProps = {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const toneClass = {
  neutral: "border-line from-surface to-sky/10",
  good: "border-leaf/25 from-surface to-leaf/15",
  warning: "border-amber/35 from-surface to-amber/20",
  danger: "border-coral/30 from-surface to-coral/15"
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
      className={`interactive-card animate-rise-in relative overflow-hidden rounded-app border bg-gradient-to-br p-4 shadow-soft select-none ${toneClass[tone]}`}
      role="status"
      aria-label={`${label}: ${value}${note ? ` (${note})` : ""}`}
    >
      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full shadow-sm ${markerClass[tone]}`} />
      <span className="text-xs font-bold uppercase tracking-normal text-muted">{label}</span>
      <strong className="metric-number animate-text-reveal mt-2 block text-2xl leading-tight">{value}</strong>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
    </section>
  );
}
