import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { formatBRL } from "@/lib/format";
import type { BudgetItem } from "@/types/finance";

const statusLabel = {
  ok: "Tranquilo",
  attention: "Atenção",
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

export function BudgetCategoryCard({
  item,
  onDeleteBudget,
  onDeleteCategory
}: {
  item: BudgetItem;
  onDeleteBudget?: (item: BudgetItem) => void;
  onDeleteCategory?: (item: BudgetItem) => void;
}) {
  return (
    <article className="app-card interactive-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{item.categoryName}</h3>
          <p className="mt-1 text-sm text-muted">Seu limite para este mês nesta categoria.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-app px-2 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
          {onDeleteBudget ? <IconButton icon={Trash2} label={`Remover limite de ${item.categoryName}`} onClick={() => onDeleteBudget(item)} /> : null}
        </div>
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
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`progress-fill h-2 rounded-full ${barClass[item.status]}`} style={{ width: `${Math.min(100, item.progress)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{Math.round(item.progress)}% usado do limite.</p>
      {onDeleteCategory ? (
        <button className="btn-secondary mt-3 w-full" type="button" onClick={() => onDeleteCategory(item)}>
          <Trash2 size={16} aria-hidden />
          Remover categoria
        </button>
      ) : null}
    </article>
  );
}
