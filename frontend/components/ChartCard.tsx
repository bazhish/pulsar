type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="rounded-app border border-line bg-white p-4 shadow-soft">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
