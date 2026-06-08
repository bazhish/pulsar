"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, FileUp, Layers3, PieChart as PieIcon, ReceiptText, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ActionRecommendationCard } from "@/components/ActionRecommendationCard";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { MainInsightCard } from "@/components/MainInsightCard";
import { QuickSettingsCard } from "@/components/QuickSettingsCard";
import { SectionIntro } from "@/components/SectionIntro";
import { TransactionList } from "@/components/TransactionList";
import { formatBRL } from "@/lib/format";
import { useTheme } from "@/lib/theme";
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

const paymentMethodColors: Record<string, string> = {
  "pix": "#8B5CF6",
  "debit": "#06B6D4",
  "credit": "#EC4899",
  "cash": "#10B981",
  "transfer": "#F59E0B"
};

export function SummaryHome({ data, chartsReady, onEditPlanning }: SummaryHomeProps) {
  const { effectiveTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<string | null>(null);
  const dashboard = data?.dashboard;
  const tone = dashboard ? statusTone[dashboard.rhythmStatus] : "neutral";
  const pieData = (dashboard?.categoryBreakdown || []).map((item) => ({
    name: item.name || "Sem categoria",
    total: Number(item.total || 0),
    color: item.color || "#14B8A6"
  }));
  
  const paymentData = (dashboard?.paymentMethodBreakdown || []).map((item) => ({
    payment_method: item.payment_method || "Outro",
    total: Number(item.total || 0),
    color: paymentMethodColors[item.payment_method?.toLowerCase() || ""] || "#6B7280"
  }));
  
  const hasBudget = Boolean(data?.budget.items.length);
  const chartGrid = effectiveTheme === "dark" ? "#2D3E55" : "#DDE7F0";
  const chartText = effectiveTheme === "dark" ? "#96A4B8" : "#6D7B8D";
  const chartStroke = effectiveTheme === "dark" ? "#E8EFF7" : "#102033";
  const tooltipStyle = {
    backgroundColor: effectiveTheme === "dark" ? "#0E1B2D" : "#FFFFFF",
    border: `1px solid ${chartGrid}`,
    borderRadius: 12,
    color: effectiveTheme === "dark" ? "#E8EFF7" : "#102033"
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <MainInsightCard userName={data?.user.name} dashboard={dashboard} alert={data?.alerts[0]} />
        <div className="grid gap-4">
          <QuickSettingsCard settings={data?.settings || null} onEdit={onEditPlanning} />
          <ActionRecommendationCard dashboard={dashboard} alerts={data?.alerts || []} hasBudget={hasBudget} transactions={data?.transactions || []} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Salário do mês" value={formatBRL(dashboard?.salaryBase || 0)} note={`${dashboard?.salaryCommittedPercent || 0}% comprometido`} />
        <KpiCard label="Entradas" value={formatBRL(dashboard?.inflow || 0)} tone="good" />
        <KpiCard label="Saídas" value={formatBRL(dashboard?.outflow || 0)} tone={dashboard && dashboard.outflow > dashboard.salaryBase ? "danger" : "neutral"} />
        <KpiCard label="Ritmo Score" value={String(data?.score.score || "--")} note={data?.score.label} tone={tone} />
      </div>

      <section className="app-card p-4">
        <SectionIntro
          title="Categorias do mês"
          description="Veja quais áreas mais consumiram seu dinheiro neste mês. Isso ajuda a identificar onde você pode economizar."
          helpText="Cada fatia representa uma categoria de despesa. Quanto maior a fatia, maior o impacto no seu salário."
        />
        {pieData.length ? (
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="h-64">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={3}
                      isAnimationActive
                      animationDuration={650}
                      animationEasing="ease-out"
                      onMouseEnter={(_: unknown, index: number) => setActiveCategory(pieData[index]?.name || null)}
                      onMouseLeave={() => setActiveCategory(null)}
                    >
                      {pieData.map((item) => (
                        <Cell
                          key={item.name}
                          fill={item.color}
                          opacity={!activeCategory || activeCategory === item.name ? 1 : 0.38}
                          stroke={activeCategory === item.name ? chartStroke : "transparent"}
                          strokeWidth={activeCategory === item.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatBRL(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="space-y-2">
              {pieData.slice(0, 6).map((item) => (
                <div
                  key={item.name}
                  className={`interactive-list-item flex items-center justify-between gap-3 rounded-app border p-3 text-sm shadow-sm ${activeCategory === item.name ? "border-pulse/60 bg-pulse/10" : "border-line bg-surface/75"}`}
                  onMouseEnter={() => setActiveCategory(item.name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
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
            description="Cadastre suas despesas do mês para descobrir para onde seu dinheiro está indo."
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
            description="Entenda se seus gastos estão concentrados em Pix, débito, crédito ou dinheiro."
            helpText="Use esse gráfico para perceber se alguma forma de pagamento está pesando demais no mês."
          />
          {paymentData.length ? (
            <div className="space-y-4">
              <div className="h-56">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis 
                        dataKey="payment_method" 
                        tickLine={false} 
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12, fill: chartText }}
                      />
                      <YAxis 
                        width={50} 
                        tickFormatter={(value) => `R$${Number(value) / 1000}k`} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: chartText }}
                      />
                      <Tooltip 
                        formatter={(value) => formatBRL(Number(value))}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="total"
                        radius={[10, 10, 0, 0]}
                        activeBar={{ fillOpacity: 0.88, stroke: chartStroke, strokeWidth: 2 }}
                        isAnimationActive
                        animationDuration={650}
                        animationEasing="ease-out"
                        onMouseEnter={(_: unknown, index: number) => setActivePayment(paymentData[index]?.payment_method || null)}
                        onMouseLeave={() => setActivePayment(null)}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} opacity={!activePayment || activePayment === entry.payment_method ? 1 : 0.42} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {paymentData.map((item) => (
                  <div
                    key={item.payment_method}
                    className={`interactive-list-item flex items-center justify-between rounded-app border p-3 text-sm shadow-sm ${activePayment === item.payment_method ? "border-pulse/60 bg-pulse/10" : "border-line bg-surface/75"}`}
                    onMouseEnter={() => setActivePayment(item.payment_method)}
                    onMouseLeave={() => setActivePayment(null)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.payment_method}
                    </span>
                    <strong>{formatBRL(item.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Sem formas de pagamento ainda"
              description="Cadastre despesas para entender como você costuma pagar."
              actionLabel="Cadastrar despesa"
              href="/transacoes"
              icon={Wallet}
            />
          )}
        </div>

        <div className="app-card p-4">
          <SectionIntro
            title="Movimentações recentes"
            description="Aqui aparecem suas movimentações mais recentes. Cadastre entradas e despesas para acompanhar seu fluxo financeiro."
            helpText="Use esta lista para conferir rapidamente se o mês está atualizado."
          />
          {dashboard?.recentTransactions.length ? (
            <TransactionList items={dashboard.recentTransactions} />
          ) : (
            <EmptyState
              title="Nenhuma movimentação ainda"
              description="Comece por uma entrada, uma despesa ou importe seu extrato para preencher o Resumo."
              actionLabel="Cadastrar movimentação"
              href="/transacoes"
              icon={ReceiptText}
            />
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/parcelas", icon: Layers3, title: "Simular compra parcelada", description: "Veja o impacto nos próximos meses antes de registrar uma compra." },
          { href: "/importar", icon: FileUp, title: "Importar extrato CSV", description: "Traga movimentações do banco e revise tudo antes de confirmar." },
          { href: "/relatorios", icon: BarChart3, title: "Ver relatório do mês", description: "Analise categorias, formas de pagamento e evolução mensal." }
        ].map((action) => (
          <Link className="app-card interactive-card focus-ring p-4 transition hover:-translate-y-0.5 hover:border-pulse/50" href={action.href} key={action.href}>
            <span className="flex h-10 w-10 items-center justify-center rounded-app bg-pulse/10 text-pulse">
              <action.icon size={20} aria-hidden />
            </span>
            <strong className="mt-3 block text-sm text-ink">{action.title}</strong>
            <span className="mt-1 block text-sm text-muted">{action.description}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
