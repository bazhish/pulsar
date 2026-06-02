import type { Card } from "@/types/finance";
import { formatBRL } from "@/lib/format";

export function CardSummary({ card }: { card: Card }) {
  return (
    <section className="rounded border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{card.name}</h3>
          <p className="text-sm text-black/55">{card.brand} · final {card.last_four}</p>
        </div>
        <span className="rounded bg-black/5 px-2 py-1 text-xs">{card.remainingInstallments || 0} parcelas</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span>Fatura<br /><strong>{formatBRL(card.invoice || 0)}</strong></span>
        <span>Comprometido<br /><strong>{formatBRL(card.committedLimit || 0)}</strong></span>
      </div>
    </section>
  );
}
