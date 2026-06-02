"use client";

import { useEffect, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { TransactionList } from "@/components/TransactionList";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap } from "@/types/finance";

export default function DashboardPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Bootstrap | null>(null);

  useEffect(() => {
    if (!token) return;
    api.bootstrap(token, month).then(setData).catch(console.error);
  }, [token, month]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-black/60">Resumo mensal do fluxo financeiro.</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Entradas" value={formatBRL(data?.dashboard.inflow || 0)} />
          <KpiCard label="Saídas" value={formatBRL(data?.dashboard.outflow || 0)} />
          <KpiCard label="Saldo" value={formatBRL(data?.dashboard.balance || 0)} />
          <KpiCard label="Score" value={String(data?.score.score || "--")} note={data?.score.label} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          <ChartCard title="Tendência mensal">
            <div className="space-y-2">
              {(data?.dashboard.monthlyTrend || []).slice(-6).map((item) => (
                <div key={item.month} className="grid grid-cols-[70px_1fr_auto] items-center gap-3 text-sm">
                  <span>{item.label}</span>
                  <div className="h-2 rounded bg-black/10">
                    <div className="h-2 rounded bg-sky" style={{ width: `${Math.min(100, Math.abs(item.net) / 100)}%` }} />
                  </div>
                  <strong>{formatBRL(item.net)}</strong>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Últimos lançamentos">
            <TransactionList items={data?.dashboard.recentTransactions || []} />
          </ChartCard>
        </div>
      </div>
    </Shell>
  );
}
