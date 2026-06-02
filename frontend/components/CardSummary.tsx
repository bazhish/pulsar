import type { Card } from "@/types/finance";
import { formatBRL } from "@/lib/format";

export function CardSummary({ card }: { card: Card }) {
  const used = card.credit_limit ? Math.min(100, ((card.invoice || 0) / card.credit_limit) * 100) : 0;

  return (
    <section className="rounded-app border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{card.name}</h3>
          <p className="text-sm text-muted">
            {card.brand} / final {card.last_four}
          </p>
        </div>
        <span className="rounded-app bg-ink/5 px-2 py-1 text-xs font-semibold">{card.remainingInstallments || 0} parcelas</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span>
          Fatura
          <br />
          <strong>{formatBRL(card.invoice || 0)}</strong>
        </span>
        <span>
          Comprometido
          <br />
          <strong>{formatBRL(card.committedLimit || 0)}</strong>
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-ink/10">
        <div className="h-2 rounded-full bg-pulse" style={{ width: `${used}%` }} />
      </div>
    </section>
  );
}
