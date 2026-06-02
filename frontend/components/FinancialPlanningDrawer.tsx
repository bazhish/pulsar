"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCards, X } from "lucide-react";
import type { Settings } from "@/types/finance";

type PlanningValues = {
  monthlyIncome: number;
  reserveAmount: number;
  dailyGoal: number;
};

type FinancialPlanningDrawerProps = {
  open: boolean;
  settings: Settings | null;
  onClose: () => void;
  onSave: (values: PlanningValues) => Promise<void>;
};

function asInput(value: number | undefined | null) {
  return String(value ?? 0);
}

function asNumber(value: string) {
  return Number(value.replace(",", ".") || 0);
}

export function FinancialPlanningDrawer({ open, settings, onClose, onSave }: FinancialPlanningDrawerProps) {
  const [form, setForm] = useState({
    monthlyIncome: "0",
    reserveAmount: "0",
    dailyGoal: "0"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      monthlyIncome: asInput(settings?.monthly_income),
      reserveAmount: asInput(settings?.reserve_amount),
      dailyGoal: asInput(settings?.daily_goal)
    });
  }, [open, settings]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        monthlyIncome: asNumber(form.monthlyIncome),
        reserveAmount: asNumber(form.reserveAmount),
        dailyGoal: asNumber(form.dailyGoal)
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-app border border-white/80 bg-paper p-4 shadow-lift sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:w-[420px] sm:rounded-app">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-pulse">
              <WalletCards size={18} />
              Ajustes rapidos
            </p>
            <h2 className="mt-1 text-xl font-black">Editar planejamento</h2>
            <p className="mt-1 text-sm text-muted">Atualize o salario, a reserva planejada e a meta diaria usada no Resumo.</p>
          </div>
          <button className="focus-ring h-9 w-9 rounded-app border border-line bg-white" type="button" onClick={onClose} aria-label="Fechar">
            <X className="mx-auto" size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            Salario base
            <input className="field mt-1" value={form.monthlyIncome} onChange={(event) => setForm({ ...form, monthlyIncome: event.target.value })} inputMode="decimal" />
          </label>
          <label className="block text-sm">
            Reserva planejada no mes
            <input className="field mt-1" value={form.reserveAmount} onChange={(event) => setForm({ ...form, reserveAmount: event.target.value })} inputMode="decimal" />
          </label>
          <label className="block text-sm">
            Meta diaria
            <input className="field mt-1" value={form.dailyGoal} onChange={(event) => setForm({ ...form, dailyGoal: event.target.value })} inputMode="decimal" />
            <span className="mt-1 block text-xs text-muted">Use 0 para deixar o app recomendar a meta automaticamente.</span>
          </label>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar planejamento"}
            </button>
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
