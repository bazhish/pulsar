"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, PiggyBank, Plus } from "lucide-react";
import { BudgetCategoryCard } from "@/components/BudgetCategoryCard";
import { EmptyState } from "@/components/EmptyState";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { KpiCard } from "@/components/KpiCard";
import { MonthPicker } from "@/components/MonthPicker";
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

function asNumber(value: string) {
  return Number(value.replace(",", ".") || 0);
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
    await api.saveBudget(token, { categoryId: Number(categoryId), month, plannedAmount: asNumber(plannedAmount) });
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
            <p className="text-sm text-muted">Quanto voce quer gastar em cada categoria este mes?</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <FirstTimeExplainer
          storageKey="rf_seen_budget_intro"
          title="Orcamento e so limite por categoria"
          description="Defina quanto pretende gastar em alimentacao, transporte, lazer e outras areas. O app mostra quando voce esta tranquilo, em atencao ou estourado."
        />

        {message ? <p className="app-card mb-4 p-3 text-sm text-ink">{message}</p> : null}

        <section className="mb-4 rounded-app border border-pulse/20 bg-gradient-to-r from-mint to-white p-4 shadow-soft">
          <h2 className="font-semibold">Use o orcamento para definir limites por categoria.</h2>
          <p className="mt-1 text-sm text-muted">Assim voce sabe quando esta perto de gastar demais.</p>
          <div className="mt-3 rounded-app border border-white/80 bg-white/80 p-3 text-sm shadow-sm">
            <strong>Exemplo:</strong> se Alimentacao = R$ 600 e voce ja gastou R$ 450, o sistema mostra 75% usado.
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Planejado" value={formatBRL(budget?.totalPlanned || 0)} />
          <KpiCard label="Usado" value={formatBRL(budget?.totalSpent || 0)} tone={(budget?.totalSpent || 0) > (budget?.totalPlanned || 0) ? "danger" : "neutral"} />
          <KpiCard label="Restante" value={formatBRL(budget?.remaining || 0)} tone={(budget?.remaining || 0) < 0 ? "danger" : "good"} />
        </div>

        <form onSubmit={handleSubmit} className="app-card mt-4 p-4">
          <SectionIntro
            title="Criar ou editar limite"
            description="Escolha uma categoria e diga o valor planejado para este mes."
            helpText="Se a categoria ja tiver orcamento, salvar de novo atualiza o limite."
          />
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
            <label className="text-sm">
              Categoria
              <select className="field mt-1" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                <option value="">Selecione</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Valor planejado
              <input className="field mt-1" value={plannedAmount} inputMode="decimal" onChange={(event) => setPlannedAmount(event.target.value)} required />
            </label>
            <button className="btn-primary self-end" type="submit"><Plus size={16} />Salvar limite</button>
            <button className="btn-secondary self-end" type="button" onClick={() => handleCopy().catch(console.error)}><Copy size={16} />Copiar anterior</button>
          </div>
        </form>

        <section className="mt-4">
          <SectionIntro
            title="Limites por categoria"
            description="Acompanhe valor planejado, gasto, restante e status de cada categoria."
            helpText="Tranquilo significa dentro do limite. Atencao indica que voce esta perto. Estourado passou do planejado."
          />
          {(budget?.items || []).length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {budget?.items.map((item) => <BudgetCategoryCard key={item.id} item={item} />)}
            </div>
          ) : (
            <EmptyState
              title="Voce ainda nao definiu orcamento para este mes"
              description="Comece definindo quanto pretende gastar em cada categoria. Exemplo: Alimentacao R$ 600, Transporte R$ 300."
              actionLabel="Criar orcamento"
              onAction={() => document.querySelector<HTMLSelectElement>("select.field")?.focus()}
              icon={PiggyBank}
            />
          )}
        </section>

        <section className="app-card mt-4 p-4">
          <SectionIntro
            title="Categorias sem orcamento"
            description="Essas categorias tiveram gasto no mes, mas ainda nao tem limite definido."
            helpText="Adicionar limite aqui ajuda o app a avisar antes do gasto sair do controle."
          />
          <div className="flex flex-wrap gap-2">
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
