import Link from "next/link";
import { ArrowRight, CreditCard, FileUp, PiggyBank, ReceiptText } from "lucide-react";
import type { Alert, Dashboard } from "@/types/finance";

type ActionRecommendationCardProps = {
  dashboard?: Dashboard | null;
  alerts: Alert[];
  hasBudget: boolean;
  hasCards: boolean;
};

export function ActionRecommendationCard({ dashboard, alerts, hasBudget, hasCards }: ActionRecommendationCardProps) {
  let href = "/transacoes";
  let label = "Cadastrar despesa";
  let description = "Registre um gasto recente para deixar seu Resumo mais fiel.";
  let Icon = ReceiptText;

  if (!dashboard?.recentTransactions.length) {
    href = "/importar";
    label = "Importar extrato";
    description = "Traga suas movimentacoes em CSV e revise antes de salvar.";
    Icon = FileUp;
  } else if (!hasBudget) {
    href = "/orcamento";
    label = "Definir orcamento";
    description = "Escolha limites por categoria e acompanhe quando estiver perto de gastar demais.";
    Icon = PiggyBank;
  } else if (!hasCards) {
    href = "/cartoes";
    label = "Cadastrar cartao";
    description = "Veja fatura, limite e compras parceladas no mesmo lugar.";
    Icon = CreditCard;
  } else if (alerts.some((alert) => alert.type === "danger" || alert.type === "warning")) {
    href = "/metas";
    label = "Revisar metas";
    description = "Confira quais dias puxaram seu ritmo para cima.";
  }

  return (
    <section className="app-card p-4">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">Proxima melhor acao</p>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-app bg-gradient-to-br from-pulse/15 to-plum/15 text-plum">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">{label}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <Link className="btn-primary mt-4 w-full sm:w-auto" href={href}>
        {label}
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
