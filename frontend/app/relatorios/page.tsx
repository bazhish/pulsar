"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
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
            <p className="text-sm text-muted">{month}</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Entradas" value={formatBRL(report?.dashboard.inflow || 0)} tone="good" />
          <KpiCard label="Saidas" value={formatBRL(report?.dashboard.outflow || 0)} />
          <KpiCard label="Saldo projetado" value={formatBRL(report?.dashboard.projectedBalance || 0)} tone={(report?.dashboard.projectedBalance || 0) < 0 ? "danger" : "good"} />
          <KpiCard label="Score interno" value={String(report?.score.score || "--")} note={report?.score.label} />
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
            <div className="h-64">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis width={44} tickFormatter={(value) => `R$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer> : null}
            </div>
          </ChartCard>

          <ChartCard title="Composicao do score">
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
            </div>
          </ChartCard>
        </div>

        <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <h2 className="font-semibold">Orcamento por categoria</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(report?.budget.items || []).map((item) => (
              <div key={item.id} className="rounded-app border border-line p-3 text-sm">
                <strong>{item.categoryName}</strong>
                <span className="block text-muted">{formatBRL(item.spent)} de {formatBRL(item.plannedAmount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
