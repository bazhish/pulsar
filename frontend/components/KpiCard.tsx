type KpiCardProps = {
  label: string;
  value: string;
  note?: string;
};

export function KpiCard({ label, value, note }: KpiCardProps) {
  return (
    <section className="rounded border border-black/10 bg-white p-4">
      <span className="text-xs font-semibold uppercase tracking-normal text-black/50">{label}</span>
      <strong className="mt-2 block text-2xl">{value}</strong>
      {note ? <p className="mt-1 text-sm text-black/55">{note}</p> : null}
    </section>
  );
}
