"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, PiggyBank, Plus } from "lucide-react";
import { BudgetCategoryCard } from "@/components/BudgetCategoryCard";
import { EmptyState } from "@/components/EmptyState";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { KpiCard } from "@/components/KpiCard";
import { MoneyInput } from "@/components/MoneyInput";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
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
  const [plannedAmount, setPlannedAmount] = useState(0);
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
    await api.saveBudget(token, { categoryId: Number(categoryId), month, plannedAmount });
    setCategoryId("");
    setPlannedAmount(0);
    setMessage("Orçamento salvo.");
    await load();
  }

  async function handleCopy() {
    if (!token) return;
    const copied = await api.copyBudget(token, { fromMonth: previousMonth(month), toMonth: month });
    setBudget(copied);
    setMessage("Orçamento copiado do mês anterior.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <PageHeader
          actions={
            <MonthPicker value={month} onChange={setMonth} />
          }
          description="Defina limites para cada categoria e acompanhe seus gastos."
          helpText="Defina limites por categoria para saber quando está perto de gastar demais."
          icon={PiggyBank}
          title="Orçamento"
        />

        <FirstTimeExplainer
          storageKey="pulsar_seen_budget_intro"
          title="Orçamento ajuda você a gastar melhor"
          description="Defina limites por categoria e o app avisa quando você está perto de gastar demais. Assim você mantém as despesas sob controle."
        />

        {message ? <p className="app-card mb-4 p-3 text-sm text-ink">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Planejado" value={formatBRL(budget?.totalPlanned || 0)} />
          <KpiCard label="Usado" value={formatBRL(budget?.totalSpent || 0)} tone={(budget?.totalSpent || 0) > (budget?.totalPlanned || 0) ? "danger" : "neutral"} />
          <KpiCard label="Restante" value={formatBRL(budget?.remaining || 0)} tone={(budget?.remaining || 0) < 0 ? "danger" : "good"} />
        </div>

        <form onSubmit={handleSubmit} className="app-card mt-4 p-4">
          <SectionIntro
            title="Definir ou atualizar limite"
            description="Escolha uma categoria e diga quanto você pretende gastar neste mês."
            helpText="Se a categoria já tiver limite, salvar novamente atualiza o valor."
          />
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
            <label className="text-sm">
              Categoria
              <select className="field mt-1" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Limite mensal
              <MoneyInput className="field mt-1" value={plannedAmount} onValueChange={setPlannedAmount} required />
            </label>
            <button className="btn-primary self-end" type="submit"><Plus size={16} />Salvar limite</button>
            <button className="btn-secondary self-end" type="button" onClick={() => handleCopy().catch(console.error)}><Copy size={16} />Copiar do mês anterior</button>
          </div>
        </form>

        <section className="mt-4">
          <SectionIntro
            title="Acompanhe seus limites"
            description="Veja quanto você pretendeu gastar, quanto já gastou e quanto ainda pode gastar em cada categoria."
            helpText="Os cores indicam se está tudo bem (tranquilo), se está perto do limite (atenção) ou se passou (estourado)."
          />
          {(budget?.items || []).length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {budget?.items.map((item) => <BudgetCategoryCard key={item.id} item={item} />)}
            </div>
          ) : (
            <EmptyState
              title="Você ainda não definiu limite para este mês"
              description="Comece definindo quanto você pretende gastar em cada categoria. Por exemplo: Alimentação R$ 600, Transporte R$ 200. Assim o app avisa quando você está perto do limite."
              actionLabel="Definir primeiro limite"
              onAction={() => document.querySelector<HTMLSelectElement>("select.field")?.focus()}
              icon={PiggyBank}
            />
          )}
        </section>

        <section className="app-card mt-4 p-4">
          <SectionIntro
            title="Categorias que ainda não têm limite"
            description="Essas categorias tiveram gastos no mês, mas você ainda não definiu um limite para elas."
            helpText="Recomendamos definir limites para todas as categorias que você gasta."
          />
          <div className="flex flex-wrap gap-2">
            {(budget?.unbudgetedCategories || []).map((category) => (
              <span key={category.categoryId} className="rounded-app border border-line px-3 py-2 text-sm">
                {category.categoryName} / {formatBRL(category.spent)}
              </span>
            ))}
            {!budget?.unbudgetedCategories.length ? <p className="text-sm text-muted">Todas as categorias ativas têm orçamento.</p> : null}
          </div>
        </section>
      </div>
    </Shell>
  );
}
