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

function sumTransactions(items: Transaction[], type: Transaction["type"]) {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function DailyGoalCalendar({ goal, transactions = [] }: DailyGoalCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<GoalDay | null>(null);
  const activeDay = selectedDay || goal?.days.find((day) => day.day === goal.progressDay) || goal?.days[0] || null;

  const transactionsByDay = useMemo(() => {
    const grouped = new Map<number, Transaction[]>();
    transactions.forEach((item) => {
      const key = dayKey(item.transaction_date);
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return grouped;
  }, [transactions]);

  if (!goal?.days.length) {
    return (
      <EmptyState
        title="Nenhum dia para mostrar"
        description="Defina seu planejamento e cadastre movimentacoes para ver o ritmo diario do mes."
        actionLabel="Cadastrar movimentacao"
        href="/transacoes"
        icon={ReceiptText}
      />
    );
  }

  const activeTransactions = activeDay ? (transactionsByDay.get(activeDay.day) || []).slice(0, 6) : [];
  const fallbackIncome = sumTransactions(activeTransactions, "income");
  const fallbackExpense = sumTransactions(activeTransactions, "expense");
  const dailyIncome = activeDay?.income ?? fallbackIncome;
  const dailyExpense = activeDay?.expense ?? activeDay?.spent ?? fallbackExpense;
  const dailyNet = activeDay?.net ?? dailyIncome - dailyExpense;
  const dailyDelta = activeDay?.dailyGoalDelta ?? activeDay?.remaining ?? 0;

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
            <dt className="text-muted">Entradas do dia</dt>
            <dd className="font-semibold text-leaf">{formatBRL(dailyIncome)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Despesas do dia</dt>
            <dd className="font-semibold text-coral">{formatBRL(dailyExpense)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Resultado do dia</dt>
            <dd className={dailyNet < 0 ? "font-semibold text-coral" : "font-semibold text-leaf"}>{formatBRL(dailyNet)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Meta de referencia</dt>
            <dd className="font-semibold">{formatBRL(goal.targetDailyGoal || 0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Diferenca da meta diaria</dt>
            <dd className={dailyDelta < 0 ? "font-semibold text-coral" : "font-semibold text-leaf"}>{formatBRL(dailyDelta)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Movimentacoes do dia</h4>
          <div className="mt-2 space-y-2">
            {activeTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-app bg-surface-muted/60 p-2 text-sm">
                <span className="min-w-0">
                  <span className={item.type === "income" ? "mr-2 rounded-app bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf" : "mr-2 rounded-app bg-coral/10 px-2 py-0.5 text-[11px] font-semibold text-coral"}>
                    {item.type === "income" ? "Entrada" : "Despesa"}
                  </span>
                  <span className="truncate">{item.title}</span>
                </span>
                <strong className={item.type === "income" ? "text-leaf" : "text-coral"}>
                  {item.type === "income" ? "+" : "-"}
                  {formatBRL(item.amount)}
                </strong>
              </div>
            ))}
            {!activeTransactions.length ? <p className="text-sm text-muted">Nenhuma movimentacao nesse dia.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
