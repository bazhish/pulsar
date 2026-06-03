import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Alert, Dashboard } from "@/types/finance";

const statusCopy = {
  green: "Seu ritmo hoje está dentro da meta.",
  yellow: "Seu ritmo pede atenção hoje.",
  red: "Seu ritmo está acima do planejado."
};

const statusClass = {
  green: "border-leaf bg-leaf/10 text-leaf",
  yellow: "border-amber bg-amber/10 text-ink",
  red: "border-coral bg-coral/10 text-coral"
};

type MainInsightCardProps = {
  userName?: string;
  dashboard?: Dashboard | null;
  alert?: Alert;
};

type MiniMetricProps = {
  label: string;
  value: string;
};

function MiniMetric({ label, value }: MiniMetricProps) {
  return (
    <div className="rounded-app bg-white/10 p-3 backdrop-blur">
      <span className="text-xs font-semibold text-white/70">{label}</span>
      <strong className="mt-1 block text-lg font-bold text-white">{value}</strong>
    </div>
  );
}

export function MainInsightCard({ userName, dashboard, alert }: MainInsightCardProps) {
  const status = dashboard?.rhythmStatus || "green";
  const Icon = status === "green" ? CheckCircle2 : status === "yellow" ? AlertTriangle : TrendingDown;

  return (
    <section className="relative overflow-hidden rounded-app border border-white/10 bg-gradient-to-br from-night via-ink to-plum p-5 text-white shadow-lift">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-pulse/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-44 rounded-tl-full border-l border-t border-white/10" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/70">Olá{userName ? `, ${userName}` : ""}.</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{dashboard ? statusCopy[status] : "Seu resumo está carregando."}</h1>
        </div>
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-app border ${statusClass[status]}`}>
          <Icon size={22} />
        </span>
      </div>
      <div className="mt-6">
        <span className="text-sm font-semibold text-white/70">Você pode gastar hoje</span>
        <strong className="mt-2 block text-4xl font-black leading-tight tracking-normal sm:text-5xl">{formatBRL(dashboard?.availableToday || 0)}</strong>
        <p className="mt-2 text-sm text-white/75">
          Saldo projetado de {formatBRL(dashboard?.projectedBalance || 0)} no fim do mês.
        </p>
      </div>
      <div className="relative mt-4 rounded-app border border-white/15 bg-white/10 p-3 text-sm text-white/85 backdrop-blur">
        {alert?.message || "Cadastre suas entradas e despesas para o app apontar o próximo melhor ajuste."}
      </div>
      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniMetric label="Salário" value={formatBRL(dashboard?.salaryBase || 0)} />
        <MiniMetric label="Entradas" value={formatBRL(dashboard?.inflow || 0)} />
        <MiniMetric label="Saídas" value={formatBRL(dashboard?.outflow || 0)} />
        <MiniMetric label="Saldo projetado" value={formatBRL(dashboard?.projectedBalance || 0)} />
      </div>
    </section>
  );
}
