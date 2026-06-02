"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { ReportSummary } from "@/types/finance";

async function downloadFile(url: string, token: string, filename: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Falha ao baixar arquivo.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export default function RelatoriosPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [message, setMessage] = useState("");
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.reports(token, month).then(setReport).catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [token, month]);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const categoryRows = report?.dashboard.categoryBreakdown || [];

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText size={24} /> Relatorios</h1>
            <p className="text-sm text-muted">Analise o mes com calma ou exporte CSV/PDF.</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Entradas" value={formatBRL(report?.dashboard.inflow || 0)} tone="good" />
          <KpiCard label="Saidas" value={formatBRL(report?.dashboard.outflow || 0)} />
          <KpiCard label="Saldo projetado" value={formatBRL(report?.dashboard.projectedBalance || 0)} tone={(report?.dashboard.projectedBalance || 0) < 0 ? "danger" : "good"} />
          <KpiCard label="Ritmo Score" value={String(report?.score.score || "--")} note={report?.score.label} />
        </div>

        <section className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={() => token && downloadFile(api.exportCsvUrl(month), token, `financeiro-${month}.csv`).catch((err) => setMessage(err.message))}>
            <Download size={16} />CSV
          </button>
          <button className="btn-secondary" type="button" onClick={() => token && downloadFile(api.exportPdfUrl(month), token, `financeiro-${month}.pdf`).catch((err) => setMessage(err.message))}>
            <Download size={16} />PDF
          </button>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <ChartCard title="Categorias">
            <SectionIntro
              title="Gastos por categoria"
              description="Compare onde o dinheiro saiu no mes."
              helpText="Use este grafico para achar categorias que merecem limite no Orcamento."
            />
            <div className="h-64">
              {categoryRows.length && chartsReady ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis width={44} tickFormatter={(value) => `R$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer> : <EmptyState title="Sem categorias para analisar" description="Cadastre despesas para gerar o relatorio por categoria." actionLabel="Cadastrar despesa" href="/transacoes" icon={FileText} />}
            </div>
          </ChartCard>

          <ChartCard title="Composicao do score">
            <SectionIntro
              title="Ritmo Score"
              description="Entenda os fatores que puxam seu score para cima ou para baixo."
              helpText="O score resume uso do salario, metas, reservas e organizacao do mes."
            />
            <div className="space-y-3">
              {Object.entries(report?.score.breakdown || {}).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{key}</span>
                    <strong>{value > 0 ? "+" : ""}{value}</strong>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-ink/10">
                    <div className={value < 0 ? "h-2 rounded-full bg-coral" : "h-2 rounded-full bg-pulse"} style={{ width: `${Math.min(100, Math.abs(value))}%` }} />
                  </div>
                </div>
              ))}
              {!Object.entries(report?.score.breakdown || {}).length ? (
                <EmptyState title="Score ainda sem composicao" description="O score aparece quando houver planejamento e movimentacoes no mes." icon={FileText} />
              ) : null}
            </div>
          </ChartCard>
        </div>

        <section className="app-card mt-4 p-4">
          <SectionIntro
            title="Orcamento por categoria"
            description="Veja os limites planejados e o quanto ja foi usado em cada categoria."
            helpText="Se esta area estiver vazia, va em Orcamento e crie limites para o mes."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(report?.budget.items || []).map((item) => (
              <div key={item.id} className="rounded-app border border-line p-3 text-sm">
                <strong>{item.categoryName}</strong>
                <span className="block text-muted">{formatBRL(item.spent)} de {formatBRL(item.plannedAmount)}</span>
              </div>
            ))}
          </div>
          {!report?.budget.items.length ? (
            <EmptyState title="Nenhum orcamento no relatorio" description="Crie limites por categoria para acompanhar o planejado contra o gasto." actionLabel="Criar orcamento" href="/orcamento" icon={FileText} />
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
