"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FinancialPlanningDrawer } from "@/components/FinancialPlanningDrawer";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
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
        <PageHeader
          actions={<MonthPicker value={month} onChange={setMonth} />}
          description="O essencial do seu mês em uma tela limpa."
          media={
            <div className="rounded-app bg-white/80 p-2 shadow-soft">
              <Image src="/logo.svg" alt="Pulsar" width={180} height={50} priority />
            </div>
          }
          title="Resumo"
        />

        <FirstTimeExplainer
          storageKey="rf_seen_summary_intro"
          title="Seu Resumo ficou mais direto"
          description="Aqui você vê quanto pode gastar hoje, o status do ritmo financeiro e a próxima melhor ação. Os detalhes continuam nas outras abas."
        />

        {message ? <p className="app-card mb-4 p-3 text-sm text-ink">{message}</p> : null}

        <SummaryHome data={data} chartsReady={chartsReady} onEditPlanning={() => setDrawerOpen(true)} />

        <FinancialPlanningDrawer open={drawerOpen} settings={data?.settings || null} onClose={() => setDrawerOpen(false)} onSave={savePlanning} />
      </div>
    </Shell>
  );
}
