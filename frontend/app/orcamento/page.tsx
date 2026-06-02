"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, PiggyBank, Plus } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { BudgetSummary, Category } from "@/types/finance";

function previousMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(year, month - 2, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export default function OrcamentoPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const [boot, summary] = await Promise.all([api.bootstrap(token, month), api.budgets(token, month)]);
    setCategories(boot.categories.filter((category) => category.type === "expense"));
    setBudget(summary);
  }, [token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !categoryId) return;
    await api.saveBudget(token, { categoryId: Number(categoryId), month, plannedAmount: Number(plannedAmount) });
    setCategoryId("");
    setPlannedAmount("");
    setMessage("Orcamento salvo.");
    await load();
  }

  async function handleCopy() {
    if (!token) return;
    const copied = await api.copyBudget(token, { fromMonth: previousMonth(month), toMonth: month });
    setBudget(copied);
    setMessage("Orcamento copiado do mes anterior.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><PiggyBank size={24} /> Orcamento</h1>
            <p className="text-sm text-muted">{month}</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm text-ink shadow-soft">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Planejado" value={formatBRL(budget?.totalPlanned || 0)} />
          <KpiCard label="Usado" value={formatBRL(budget?.totalSpent || 0)} tone={(budget?.totalSpent || 0) > (budget?.totalPlanned || 0) ? "danger" : "neutral"} />
          <KpiCard label="Restante" value={formatBRL(budget?.remaining || 0)} tone={(budget?.remaining || 0) < 0 ? "danger" : "good"} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
            <label className="text-sm">
              Categoria
              <select className="field mt-1" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                <option value="">Selecione</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Valor
              <input className="field mt-1" value={plannedAmount} inputMode="decimal" onChange={(event) => setPlannedAmount(event.target.value)} required />
            </label>
            <button className="btn-primary self-end" type="submit"><Plus size={16} />Salvar</button>
            <button className="btn-secondary self-end" type="button" onClick={() => handleCopy().catch(console.error)}><Copy size={16} />Copiar anterior</button>
          </div>
        </form>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          {(budget?.items || []).map((item) => (
            <article key={item.id} className="rounded-app border border-line bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{item.categoryName}</h2>
                  <p className="text-sm text-muted">{formatBRL(item.spent)} de {formatBRL(item.plannedAmount)}</p>
                </div>
                <span className={item.status === "over" ? "text-sm font-semibold text-coral" : item.status === "attention" ? "text-sm font-semibold text-amber" : "text-sm font-semibold text-leaf"}>
                  {item.status}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-ink/10">
                <div className={item.status === "over" ? "h-2 rounded-full bg-coral" : item.status === "attention" ? "h-2 rounded-full bg-amber" : "h-2 rounded-full bg-pulse"} style={{ width: `${Math.min(100, item.progress)}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">Restante: {formatBRL(item.remaining)}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <h2 className="font-semibold">Categorias sem orcamento</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(budget?.unbudgetedCategories || []).map((category) => (
              <span key={category.categoryId} className="rounded-app border border-line px-3 py-2 text-sm">
                {category.categoryName} / {formatBRL(category.spent)}
              </span>
            ))}
            {!budget?.unbudgetedCategories.length ? <p className="text-sm text-muted">Todas as categorias ativas tem orcamento.</p> : null}
          </div>
        </section>
      </div>
    </Shell>
  );
}
