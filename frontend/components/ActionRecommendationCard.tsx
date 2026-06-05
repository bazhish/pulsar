import Link from "next/link";
import { ArrowRight, FileUp, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import type { Alert, Dashboard, Transaction } from "@/types/finance";

type ActionRecommendationCardProps = {
  dashboard?: Dashboard | null;
  alerts: Alert[];
  hasBudget: boolean;
  transactions?: Transaction[];
};

export function ActionRecommendationCard({ 
  dashboard, 
  hasBudget, 
  transactions = []
}: ActionRecommendationCardProps) {
  const salaryBase = dashboard?.salaryBase || 0;
  const hasTransactions = (dashboard?.recentTransactions?.length || 0) > 0;
  const hasCSVImport = transactions.some(t => t.source === "csv_import");
  
  let href = "/transacoes";
  let label = "Cadastrar despesa";
  let description = "Registre um gasto recente para deixar seu Resumo mais fiel.";
  let Icon = ReceiptText;

  // Priority 1: Define salary if not set
  if (salaryBase === 0) {
    href = "/orcamento";
    label = "Definir salário";
    description = "Configure seu salário base para que o app calcule quanto você pode gastar por dia.";
    Icon = PiggyBank;
  }
  // Priority 2: Add first transaction
  else if (!hasTransactions) {
    href = "/transacoes";
    label = "Cadastrar despesa";
    description = "Registre um gasto recente para deixar seu Resumo mais fiel.";
    Icon = ReceiptText;
  }
  // Priority 3: Import CSV
  else if (!hasCSVImport) {
    href = "/importar";
    label = "Importar extrato";
    description = "Traga suas movimentações em CSV e atualize automaticamente seu histórico.";
    Icon = FileUp;
  }
  // Priority 4: Create budget
  else if (!hasBudget) {
    href = "/orcamento";
    label = "Criar orçamento";
    description = "Defina limites por categoria para controlar melhor seus gastos.";
    Icon = PiggyBank;
  }
  else {
    href = "/relatorios";
    label = "Ver relatório do mês";
    description = "Analise em detalhes como você gastou e onde pode melhorar.";
    Icon = TrendingUp;
  }

  return (
    <section className="app-card p-4">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">Próxima melhor ação</p>
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
