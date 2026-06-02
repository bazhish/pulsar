"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Goal } from "@/types/finance";

const dayClass = {
  ok: "border-leaf/30 bg-leaf/10 text-ink",
  over: "border-coral/40 bg-coral/10 text-ink",
  empty: "border-line bg-white text-muted"
};

export default function MetasPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (!token) return;
    api.goals(token, month).then(setGoal).catch(console.error);
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
            <p className="text-sm text-muted">{goal?.riskAlert || month}</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Meta recomendada" value={formatBRL(goal?.recommendedDailyGoal || 0)} tone="good" />
          <KpiCard label="Meta em uso" value={formatBRL(goal?.targetDailyGoal || 0)} />
          <KpiCard label="Permitido restante" value={formatBRL(goal?.allowedRemaining || 0)} tone={(goal?.allowedRemaining || 0) < 0 ? "danger" : "neutral"} />
          <KpiCard label="Projecao de gasto" value={formatBRL(goal?.projectedClosing || 0)} tone={goal?.goalStatus === "red" ? "danger" : goal?.goalStatus === "yellow" ? "warning" : "good"} />
        </div>

        <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Calendario do ritmo</h2>
            <div className="flex gap-2 text-xs text-muted">
              <span>{goal?.daysBelowGoal || 0} dentro</span>
              <span>{goal?.daysAboveGoal || 0} acima</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {(goal?.days || []).map((day) => (
              <div key={day.day} className={`min-h-20 rounded-app border p-2 text-sm ${dayClass[day.status]}`}>
                <strong>{day.day}</strong>
                <span className="mt-1 block text-xs">{formatBRL(day.spent)}</span>
                <span className={day.remaining < 0 ? "mt-1 block text-xs text-coral" : "mt-1 block text-xs text-muted"}>
                  {day.remaining < 0 ? "-" : "+"}
                  {formatBRL(Math.abs(day.remaining))}
                </span>
              </div>
            ))}
          </div>
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
