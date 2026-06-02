import type { Transaction } from "@/types/finance";
import { formatBRL } from "@/lib/format";

export function TransactionList({ items }: { items: Transaction[] }) {
  if (!items.length) return <p className="text-sm text-black/55">Nenhum lançamento encontrado.</p>;
  return (
    <div className="divide-y divide-black/10">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-3">
          <div>
            <strong className="block text-sm">{item.title}</strong>
            <small className="text-black/55">{item.transaction_date} · {item.category_name || "Sem categoria"}</small>
          </div>
          <span className={item.type === "income" ? "font-semibold text-leaf" : "font-semibold text-coral"}>
            {item.type === "income" ? "+" : "-"}{formatBRL(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
