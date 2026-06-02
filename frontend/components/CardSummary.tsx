import type { Card } from "@/types/finance";
import { formatBRL } from "@/lib/format";

export function CardSummary({ card }: { card: Card }) {
  const used = card.credit_limit ? Math.min(100, ((card.invoice || 0) / card.credit_limit) * 100) : 0;
  const available = card.availableCredit ?? card.available_credit ?? Math.max(0, (card.credit_limit || 0) - (card.invoice || 0));
  const committed = card.committedLimit ?? card.committed_limit ?? 0;

  return (
    <section className="app-card overflow-hidden p-4">
      <div className="mb-4 h-2 rounded-full" style={{ backgroundColor: card.color || "#14B8A6" }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{card.name}</h3>
          <p className="text-sm text-muted">
            {card.brand} / final {card.last_four}
          </p>
        </div>
        <span className="rounded-app bg-plum/10 px-2 py-1 text-xs font-bold text-plum">{card.remainingInstallments || 0} parcelas</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span>
          Fatura atual
          <br />
          <strong className="metric-number">{formatBRL(card.invoice || 0)}</strong>
        </span>
        <span>
          Limite disponivel
          <br />
          <strong className="metric-number">{formatBRL(available)}</strong>
        </span>
        <span>
          Limite usado
          <br />
          <strong className="metric-number">{Math.round(used)}%</strong>
        </span>
        <span>
          Vencimento
          <br />
          <strong className="metric-number">Dia {card.due_day || "--"}</strong>
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-ink/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-pulse to-plum" style={{ width: `${used}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">Fechamento dia {card.closing_day || "--"} / limite total {formatBRL(card.credit_limit || 0)} / comprometido {formatBRL(committed)}</p>
    </section>
  );
}
