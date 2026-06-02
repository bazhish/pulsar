"use client";

import { SlidersHorizontal } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Settings } from "@/types/finance";

type QuickSettingsCardProps = {
  settings: Settings | null;
  onEdit: () => void;
};

export function QuickSettingsCard({ settings, onEdit }: QuickSettingsCardProps) {
  return (
    <section className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Seu planejamento</h2>
          <p className="mt-1 text-sm text-muted">Ajuste o basico sem sair do Resumo.</p>
        </div>
        <button className="btn-secondary px-3" type="button" onClick={onEdit}>
          <SlidersHorizontal size={16} />
          Editar
        </button>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-app bg-mint/70 px-3 py-2">
          <span className="text-muted">Salario</span>
          <strong className="metric-number">{formatBRL(settings?.monthly_income || 0)}</strong>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-app bg-sky/5 px-3 py-2">
          <span className="text-muted">Reserva planejada</span>
          <strong className="metric-number">{formatBRL(settings?.reserve_amount || 0)}</strong>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-app bg-plum/5 px-3 py-2">
          <span className="text-muted">Meta diaria</span>
          <strong className="metric-number">{formatBRL(settings?.daily_goal || 0)}</strong>
        </div>
      </div>
    </section>
  );
}
