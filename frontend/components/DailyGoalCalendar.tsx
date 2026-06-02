"use client";

import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { DailyGoalCircle } from "@/components/DailyGoalCircle";
import { EmptyState } from "@/components/EmptyState";
import { formatBRL } from "@/lib/format";
import type { Goal, GoalDay, Transaction } from "@/types/finance";

type DailyGoalCalendarProps = {
  goal: Goal | null;
  transactions?: Transaction[];
};

function dayKey(transactionDate: string) {
  return Number(transactionDate.slice(8, 10));
}

export function DailyGoalCalendar({ goal, transactions = [] }: DailyGoalCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<GoalDay | null>(null);
  const activeDay = selectedDay || goal?.days.find((day) => day.day === goal.progressDay) || goal?.days[0] || null;

  const expensesByDay = useMemo(() => {
    const grouped = new Map<number, Transaction[]>();
    transactions.filter((item) => item.type === "expense").forEach((item) => {
      const key = dayKey(item.transaction_date);
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return grouped;
  }, [transactions]);

  if (!goal?.days.length) {
    return (
      <EmptyState
        title="Nenhum dia para mostrar"
        description="Defina seu planejamento e cadastre despesas para ver o ritmo diario do mes."
        actionLabel="Cadastrar despesa"
        href="/transacoes"
        icon={ReceiptText}
      />
    );
  }

  const activeExpenses = activeDay ? (expensesByDay.get(activeDay.day) || []).slice(0, 4) : [];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {goal.days.map((day) => (
          <DailyGoalCircle key={day.day} day={day} active={activeDay?.day === day.day} onSelect={() => setSelectedDay(day)} />
        ))}
      </div>
      <aside className="app-card p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted">Detalhes do dia</p>
        <h3 className="mt-1 text-xl font-bold">Dia {activeDay?.day || "--"}</h3>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Gasto</dt>
            <dd className="font-semibold">{formatBRL(activeDay?.spent || 0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Meta do dia</dt>
            <dd className="font-semibold">{formatBRL(goal.targetDailyGoal || 0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Diferenca</dt>
            <dd className={(activeDay?.remaining || 0) < 0 ? "font-semibold text-coral" : "font-semibold text-leaf"}>{formatBRL(activeDay?.remaining || 0)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Principais despesas</h4>
          <div className="mt-2 space-y-2">
            {activeExpenses.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-app bg-mint/60 p-2 text-sm">
                <span className="truncate">{item.title}</span>
                <strong>{formatBRL(item.amount)}</strong>
              </div>
            ))}
            {!activeExpenses.length ? <p className="text-sm text-muted">Nenhuma despesa nesse dia.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
