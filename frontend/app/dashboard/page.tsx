"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { TransactionList } from "@/components/TransactionList";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap } from "@/types/finance";

const statusLabel = {
  green: "dentro da meta",
  yellow: "atencao",
  red: "critico"
};

const statusTone = {
  green: "good",
  yellow: "warning",
  red: "danger"
} as const;

export default function DashboardPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.bootstrap(token, month).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [token, month]);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const dashboard = data?.dashboard;
  const tone = dashboard ? statusTone[dashboard.rhythmStatus] : "neutral";
  const pieData = (dashboard?.categoryBreakdown || []).map((item) => ({
    name: item.name || "Sem categoria",
    total: Number(item.total || 0),
    color: item.color || "#14B8A6"
  }));

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.svg" alt="Ritmo Financeiro Pro" width={44} height={44} />
            <div>
              <h1 className="text-2xl font-bold">Ritmo do mes</h1>
              <p className="text-sm text-muted">{month}</p>
            </div>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        {error ? <p className="mb-4 rounded-app border border-coral/30 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

        <section className={`mb-4 rounded-app border bg-ink p-5 text-white shadow-lift ${tone === "danger" ? "border-coral" : tone === "warning" ? "border-amber" : "border-pulse"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-white/70">Voce pode gastar hoje</span>
              <strong className="mt-2 block text-3xl leading-tight">{formatBRL(dashboard?.availableToday || 0)}</strong>
              <p className="mt-2 text-sm text-white/75">
                Seu ritmo esta {dashboard ? statusLabel[dashboard.rhythmStatus] : "--"}. Fechamento previsto em {formatBRL(dashboard?.projectedBalance || 0)}.
              </p>
            </div>
            {dashboard?.rhythmStatus === "green" ? <CheckCircle2 className="mt-1 text-pulse" size={28} /> : <AlertTriangle className="mt-1 text-amber" size={28} />}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Salario base" value={formatBRL(dashboard?.salaryBase || 0)} note={`${dashboard?.salaryCommittedPercent || 0}% comprometido`} />
          <KpiCard label="Entradas extras" value={formatBRL(dashboard?.extraIncome || 0)} tone="good" />
          <KpiCard label="Saidas" value={formatBRL(dashboard?.outflow || 0)} tone={dashboard && dashboard.outflow > dashboard.salaryBase ? "danger" : "neutral"} />
          <KpiCard label="Ritmo Score" value={String(data?.score.score || "--")} note={data?.score.label} tone={tone} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <ChartCard title="Fluxo dos ultimos 12 meses">
            <div className="h-64">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `R$${Number(value) / 1000}k`} width={44} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Area type="monotone" dataKey="inflow" stroke="#16A34A" fill="#16A34A22" name="Entradas" />
                  <Area type="monotone" dataKey="outflow" stroke="#DC4C3F" fill="#DC4C3F22" name="Saidas" />
                </AreaChart>
              </ResponsiveContainer> : null}
            </div>
          </ChartCard>

          <ChartCard title="Categorias do mes">
            <div className="h-64">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={3}>
                    {pieData.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                </PieChart>
              </ResponsiveContainer> : null}
            </div>
          </ChartCard>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <ChartCard title="Forma de pagamento">
            <div className="h-56">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.paymentMethodBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="payment_method" tickLine={false} axisLine={false} />
                  <YAxis width={44} tickFormatter={(value) => `R$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer> : null}
            </div>
          </ChartCard>

          <ChartCard title="Ultimos lancamentos">
            <TransactionList items={dashboard?.recentTransactions || []} />
          </ChartCard>
        </div>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          {(data?.alerts || []).slice(0, 4).map((alert) => (
            <div key={`${alert.category}-${alert.message}`} className="rounded-app border border-line bg-white p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <TrendingUp className={alert.type === "danger" ? "text-coral" : alert.type === "warning" ? "text-amber" : "text-pulse"} size={20} />
                <p className="text-sm text-ink">{alert.message}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Shell>
  );
}
