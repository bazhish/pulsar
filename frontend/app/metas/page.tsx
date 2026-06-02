"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DailyGoalCalendar } from "@/components/DailyGoalCalendar";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Goal, Transaction } from "@/types/finance";

export default function MetasPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [goal, setGoal] = useState<Goal | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([api.goals(token, month), api.bootstrap(token, month)])
      .then(([nextGoal, bootstrap]) => {
        setGoal(nextGoal);
        setTransactions(bootstrap.transactions);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [token, month]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays size={24} />
              Metas diarias
            </h1>
            <p className="text-sm text-muted">{goal?.riskAlert || "Acompanhe seu ritmo dia a dia."}</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <FirstTimeExplainer
          storageKey="rf_seen_goals_intro"
          title="Cada circulo representa um dia do mes"
          description="Quanto mais cheio, mais perto voce chegou da meta diaria. Verde esta dentro, amarelo pede atencao, vermelho passou da meta e cinza nao teve gasto."
        />

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm text-ink shadow-soft">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Meta recomendada" value={formatBRL(goal?.recommendedDailyGoal || 0)} tone="good" />
          <KpiCard label="Meta em uso" value={formatBRL(goal?.targetDailyGoal || 0)} note={(goal?.dailyGoal || 0) > 0 ? "Definida por voce" : "Recomendada pelo app"} />
          <KpiCard label="Permitido restante" value={formatBRL(goal?.allowedRemaining || 0)} tone={(goal?.allowedRemaining || 0) < 0 ? "danger" : "neutral"} />
          <KpiCard label="Projecao de gasto" value={formatBRL(goal?.projectedClosing || 0)} tone={goal?.goalStatus === "red" ? "danger" : goal?.goalStatus === "yellow" ? "warning" : "good"} />
        </div>

        <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <SectionIntro
            title="Calendario do ritmo"
            description="Cada circulo representa um dia do mes. Quanto mais cheio, mais perto voce chegou da sua meta diaria."
            helpText="Toque em um dia para ver gasto, meta, diferenca e as principais despesas daquele dia."
          />
          <DailyGoalCalendar goal={goal} transactions={transactions} />
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <KpiCard label="Media atual" value={formatBRL(goal?.currentAverageSpend || 0)} />
          <KpiCard label="Reserva planejada" value={formatBRL(goal?.reserveAmount || 0)} />
          <KpiCard label="Orcamento mensal" value={formatBRL(goal?.availableBudget || 0)} />
        </section>
      </div>
    </Shell>
  );
}
