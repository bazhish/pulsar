import type { Transaction } from "@/types/finance";
import { formatBRL } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { ReceiptText } from "lucide-react";

export function TransactionList({ items }: { items: Transaction[] }) {
  if (!items.length) {
    return (
      <EmptyState
        title="Nenhuma movimentacao ainda"
        description="Cadastre entradas e despesas para acompanhar seu fluxo financeiro."
        actionLabel="Cadastrar movimentacao"
        href="/transacoes"
        icon={ReceiptText}
      />
    );
  }

  return (
    <div className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <strong className="block truncate text-sm">{item.title}</strong>
            <small className="text-muted">
              {item.type === "income" ? "Entrada" : "Despesa"} / {item.transaction_date} / {item.category_name || "Sem categoria"}
            </small>
          </div>
          <span className={item.type === "income" ? "whitespace-nowrap font-semibold text-leaf" : "whitespace-nowrap font-semibold text-coral"}>
            {item.type === "income" ? "+" : "-"}
            {formatBRL(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
