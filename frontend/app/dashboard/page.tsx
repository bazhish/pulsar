"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FinancialPlanningDrawer } from "@/components/FinancialPlanningDrawer";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { SummaryHome } from "@/components/SummaryHome";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap } from "@/types/finance";

export default function DashboardPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Bootstrap | null>(null);
  const [message, setMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const bootstrap = await api.bootstrap(token, month);
    setData(bootstrap);
  }, [token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  async function savePlanning(values: { monthlyIncome: number; reserveAmount: number; dailyGoal: number }) {
    if (!token) return;
    const settings = await api.settings(token, values);
    setData((current) => (current ? { ...current, settings } : current));
    await load();
    setMessage("Planejamento atualizado.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.svg" alt="Ritmo Financeiro Pro" width={44} height={44} />
            <div>
              <h1 className="text-2xl font-bold">Resumo</h1>
              <p className="text-sm text-muted">O essencial do seu mes em uma tela limpa.</p>
            </div>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <FirstTimeExplainer
          storageKey="rf_seen_summary_intro"
          title="Seu Resumo ficou mais direto"
          description="Aqui voce ve quanto pode gastar hoje, o status do ritmo financeiro e a proxima melhor acao. Os detalhes continuam nas outras abas."
        />

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm text-ink shadow-soft">{message}</p> : null}

        <SummaryHome data={data} chartsReady={chartsReady} onEditPlanning={() => setDrawerOpen(true)} />

        <FinancialPlanningDrawer open={drawerOpen} settings={data?.settings || null} onClose={() => setDrawerOpen(false)} onSave={savePlanning} />
      </div>
    </Shell>
  );
}
