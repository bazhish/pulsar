"use client";

import { AlertTriangle, CalendarClock, Target, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/format";

const flowBars = [42, 68, 55, 82, 61, 74, 48];

export function AuthProductDemo({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className={`relative ${compact ? "scale-[0.92] origin-top" : ""}`}>
      <div className="pointer-events-none absolute -left-6 top-8 h-40 w-40 rounded-full bg-pulse/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-4 bottom-6 h-36 w-36 rounded-full bg-plum/20 blur-3xl" />

      <div className="glass-panel relative overflow-hidden p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-pulse">Previa do Pulsa</p>
            <h3 className="mt-1 text-lg font-black text-ink md:text-xl">Acompanhe o pulso do seu mês</h3>
          </div>
          <span className="rounded-app bg-pulse/10 px-2.5 py-1 text-[11px] font-bold text-pulse">Ao vivo</span>
        </div>

        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          <article className="rounded-app border border-line/70 bg-surface/90 p-3 shadow-soft sm:col-span-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-muted">Você pode gastar hoje</p>
                <p className="metric-number mt-1 text-2xl text-ink md:text-3xl">{formatBRL(142.3)}</p>
                <p className="mt-1 text-xs text-muted">Meta diária: {formatBRL(85)} · Restam 18 dias úteis</p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-app bg-pulse/15 text-pulse">
                <Wallet size={18} />
              </span>
            </div>
          </article>

          <article className="rounded-app border border-line/70 bg-surface/90 p-3 shadow-soft">
            <p className="text-xs font-semibold text-muted">Fluxo do mês</p>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {flowBars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-plum/70 to-pulse/80"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-leaf">Entradas acima das saídas</p>
          </article>

          <article className="rounded-app border border-line/70 bg-surface/90 p-3 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-leaf/15 text-leaf">
                <Target size={16} />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted">Meta diária</p>
                <p className="metric-number text-sm text-ink">72% dentro</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-pulse to-leaf" />
            </div>
            <p className="mt-2 text-[11px] text-muted">Gasto hoje: {formatBRL(61.2)}</p>
          </article>

          <article className="rounded-app border border-line/70 bg-surface/90 p-3 shadow-soft">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-plum" />
              <p className="text-xs font-semibold text-muted">Parcelas futuras</p>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li className="flex justify-between gap-2">
                <span className="text-ink">Notebook</span>
                <strong className="metric-number text-ink">{formatBRL(312)}</strong>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-ink">Curso online</span>
                <strong className="metric-number text-ink">{formatBRL(89)}</strong>
              </li>
            </ul>
          </article>

          <article className="rounded-app border border-amber/30 bg-amber/10 p-3 shadow-soft">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" />
              <div>
                <p className="text-xs font-bold text-ink">Alerta de orçamento</p>
                <p className="mt-1 text-[11px] text-muted">Lazer chegou a 92% do planejado neste mês.</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
