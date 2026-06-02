import { CreditCard, PieChart as PieIcon, ReceiptText, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ActionRecommendationCard } from "@/components/ActionRecommendationCard";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { MainInsightCard } from "@/components/MainInsightCard";
import { QuickSettingsCard } from "@/components/QuickSettingsCard";
import { SectionIntro } from "@/components/SectionIntro";
import { TransactionList } from "@/components/TransactionList";
import { formatBRL } from "@/lib/format";
import type { Bootstrap } from "@/types/finance";

type SummaryHomeProps = {
  data: Bootstrap | null;
  chartsReady: boolean;
  onEditPlanning: () => void;
};

const statusTone = {
  green: "good",
  yellow: "warning",
  red: "danger"
} as const;

export function SummaryHome({ data, chartsReady, onEditPlanning }: SummaryHomeProps) {
  const dashboard = data?.dashboard;
  const tone = dashboard ? statusTone[dashboard.rhythmStatus] : "neutral";
  const pieData = (dashboard?.categoryBreakdown || []).map((item) => ({
    name: item.name || "Sem categoria",
    total: Number(item.total || 0),
    color: item.color || "#14B8A6"
  }));
  const paymentData = dashboard?.paymentMethodBreakdown || [];
  const hasBudget = Boolean(data?.budget.items.length);
  const hasCards = Boolean(data?.cards.length);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <MainInsightCard userName={data?.user.name} dashboard={dashboard} alert={data?.alerts[0]} />
        <div className="grid gap-4">
          <QuickSettingsCard settings={data?.settings || null} onEdit={onEditPlanning} />
          <ActionRecommendationCard dashboard={dashboard} alerts={data?.alerts || []} hasBudget={hasBudget} hasCards={hasCards} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Salario do mes" value={formatBRL(dashboard?.salaryBase || 0)} note={`${dashboard?.salaryCommittedPercent || 0}% comprometido`} />
        <KpiCard label="Entradas" value={formatBRL(dashboard?.inflow || 0)} tone="good" />
        <KpiCard label="Saidas" value={formatBRL(dashboard?.outflow || 0)} tone={dashboard && dashboard.outflow > dashboard.salaryBase ? "danger" : "neutral"} />
        <KpiCard label="Ritmo Score" value={String(data?.score.score || "--")} note={data?.score.label} tone={tone} />
      </div>

      <section className="app-card p-4">
        <SectionIntro
          title="Categorias do mes"
          description="Veja quais areas mais consumiram seu dinheiro neste mes. Isso ajuda a identificar onde voce pode economizar."
          helpText="Cada fatia representa uma categoria de despesa. Quanto maior a fatia, maior o impacto no seu salario."
        />
        {pieData.length ? (
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="h-64">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={3}>
                      {pieData.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="space-y-2">
              {pieData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-app bg-white/75 p-3 text-sm shadow-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <strong>{formatBRL(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Nenhuma categoria com gasto ainda"
            description="Cadastre suas despesas do mes para descobrir para onde seu dinheiro esta indo."
            actionLabel="Cadastrar despesa"
            href="/transacoes"
            icon={PieIcon}
          />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="app-card p-4">
          <SectionIntro
            title="Formas de pagamento"
            description="Entenda se seus gastos estao concentrados em Pix, debito, credito ou dinheiro."
            helpText="Use esse grafico para perceber se o cartao ou outra forma de pagamento esta pesando demais no mes."
          />
          {paymentData.length ? (
            <div className="h-56">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDE7F0" />
                    <XAxis dataKey="payment_method" tickLine={false} axisLine={false} />
                    <YAxis width={44} tickFormatter={(value) => `R$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatBRL(Number(value))} />
                    <Bar dataKey="total" fill="#4F46E5" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Sem formas de pagamento ainda"
              description="Quando voce cadastrar despesas, o Resumo mostra onde seus pagamentos se concentram."
              actionLabel="Cadastrar despesa"
              href="/transacoes"
              icon={Wallet}
            />
          )}
        </div>

        <div className="app-card p-4">
          <SectionIntro
            title="Movimentacoes recentes"
            description="Aqui aparecem suas movimentacoes mais recentes. Cadastre entradas e despesas para acompanhar seu fluxo financeiro."
            helpText="Use esta lista para conferir rapidamente se o mes esta atualizado."
          />
          {dashboard?.recentTransactions.length ? (
            <TransactionList items={dashboard.recentTransactions} />
          ) : (
            <EmptyState
              title="Nenhuma movimentacao ainda"
              description="Comece por uma entrada, uma despesa ou importe seu extrato para preencher o Resumo."
              actionLabel="Cadastrar movimentacao"
              href="/transacoes"
              icon={ReceiptText}
            />
          )}
        </div>
      </section>

      {!hasCards ? (
        <EmptyState
          title="Nenhum cartao cadastrado"
          description="Cadastre um cartao para acompanhar fatura, limite disponivel e parcelas futuras."
          actionLabel="Cadastrar cartao"
          href="/cartoes"
          icon={CreditCard}
        />
      ) : null}
    </div>
  );
}
