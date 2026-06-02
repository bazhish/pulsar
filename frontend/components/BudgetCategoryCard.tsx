import { formatBRL } from "@/lib/format";
import type { BudgetItem } from "@/types/finance";

const statusLabel = {
  ok: "Tranquilo",
  attention: "Atencao",
  over: "Estourado"
};

const statusClass = {
  ok: "bg-leaf/10 text-leaf",
  attention: "bg-amber/15 text-ink",
  over: "bg-coral/10 text-coral"
};

const barClass = {
  ok: "bg-leaf",
  attention: "bg-amber",
  over: "bg-coral"
};

export function BudgetCategoryCard({ item }: { item: BudgetItem }) {
  return (
    <article className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{item.categoryName}</h3>
          <p className="mt-1 text-sm text-muted">Quanto voce quer gastar nessa categoria este mes.</p>
        </div>
        <span className={`rounded-app px-2 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted">Planejado</dt>
          <dd className="metric-number">{formatBRL(item.plannedAmount)}</dd>
        </div>
        <div>
          <dt className="text-muted">Gasto</dt>
          <dd className="metric-number">{formatBRL(item.spent)}</dd>
        </div>
        <div>
          <dt className="text-muted">Restante</dt>
          <dd className={item.remaining < 0 ? "metric-number text-coral" : "metric-number text-leaf"}>{formatBRL(item.remaining)}</dd>
        </div>
      </dl>
      <div className="mt-4 h-2 rounded-full bg-ink/10">
        <div className={`h-2 rounded-full ${barClass[item.status]}`} style={{ width: `${Math.min(100, item.progress)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{Math.round(item.progress)}% usado do limite.</p>
    </article>
  );
}
