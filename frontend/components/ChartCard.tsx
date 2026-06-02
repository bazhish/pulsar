type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="app-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="h-2 w-10 rounded-full bg-gradient-to-r from-pulse to-plum" />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
