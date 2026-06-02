"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Goal } from "@/types/finance";

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
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Metas</h1>
            <p className="text-sm text-black/60">Orçamento planejado, projeção e risco do mês.</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Meta recomendada" value={formatBRL(goal?.recommendedDailyGoal || 0)} />
          <KpiCard label="Permitido restante" value={formatBRL(goal?.allowedRemaining || 0)} />
          <KpiCard label="Projeção" value={formatBRL(goal?.projectedClosing || 0)} />
          <KpiCard label="Status" value={goal?.goalStatus || "--"} note={goal?.riskAlert} />
        </div>
        <section className="mt-4 rounded border border-black/10 bg-white p-4">
          <h2 className="mb-3 font-semibold">Dias do mês</h2>
          <div className="grid grid-cols-7 gap-2">
            {(goal?.days || []).map((day) => (
              <div key={day.day} className="rounded border border-black/10 p-2 text-center text-sm">
                <strong>{day.day}</strong>
                <span className="block text-xs text-black/55">{formatBRL(day.spent)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
