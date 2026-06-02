"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseForm, type MovementFormState } from "@/components/ExpenseForm";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { IncomeForm } from "@/components/IncomeForm";
import { MovementTabs } from "@/components/MovementTabs";
import { MonthPicker } from "@/components/MonthPicker";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, Card, Category, Transaction, TransactionType } from "@/types/finance";

function defaultDate(month: string) {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(month) ? today : `${month}-01`;
}

const emptyForm = (month: string, type: TransactionType = "expense"): MovementFormState => ({
  title: "",
  amount: "",
  type,
  categoryId: "",
  paymentMethod: "pix",
  transactionDate: defaultDate(month),
  cardId: "",
  notes: "",
  isRecurring: false
});

function asNumber(value: string) {
  return Number(value.replace(",", ".") || 0);
}

export default function TransacoesPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [items, setItems] = useState<Transaction[]>([]);
  const [monthItems, setMonthItems] = useState<Transaction[]>([]);
  const [form, setForm] = useState<MovementFormState>(() => emptyForm(month));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("expense");
  const [sourceFilter, setSourceFilter] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const [boot, transactions] = await Promise.all([
      api.bootstrap(token, month) as Promise<Bootstrap>,
      api.transactions(token, { month, search, type: typeFilter, source: sourceFilter })
    ]);
    setCategories(boot.categories);
    setCards(boot.cards);
    setMonthItems(boot.transactions);
    setItems(transactions);
  }, [token, month, search, typeFilter, sourceFilter]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  const totals = useMemo(() => ({
    expense: monthItems.filter((item) => item.type === "expense").length,
    income: monthItems.filter((item) => item.type === "income").length,
    all: monthItems.length
  }), [monthItems]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const recurringDay = Number(form.transactionDate.slice(8, 10));
    const payload = {
      title: form.title,
      amount: asNumber(form.amount),
      type: form.type,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      paymentMethod: form.type === "income" ? "pix" : form.paymentMethod,
      transactionDate: form.transactionDate,
      cardId: form.type === "expense" && form.cardId ? Number(form.cardId) : null,
      billingMonth: form.type === "expense" && form.cardId ? month : null,
      notes: form.notes,
      isRecurring: form.type === "income" ? form.isRecurring : false,
      recurrenceType: form.type === "income" && form.isRecurring ? "monthly" as const : null,
      recurrenceDay: form.type === "income" && form.isRecurring ? recurringDay : null
    };
    try {
      if (form.id) {
        await api.updateTransaction(token, form.id, {
          title: payload.title,
          amount: payload.amount,
          type: payload.type,
          categoryId: payload.categoryId,
          paymentMethod: payload.paymentMethod,
          transactionDate: payload.transactionDate,
          cardId: payload.cardId,
          billingMonth: payload.billingMonth,
          notes: payload.notes
        });
      } else {
        await api.transaction(token, payload);
      }
      setForm(emptyForm(month, form.type));
      setMessage(form.id ? "Movimentacao atualizada." : form.type === "income" ? "Entrada cadastrada." : "Despesa cadastrada.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  }

  async function handleDelete(item: Transaction) {
    if (!token || !window.confirm(`Excluir "${item.title}"?`)) return;
    await api.deleteTransaction(token, item.id);
    setMessage("Movimentacao excluida.");
    await load();
  }

  function startNew(type: TransactionType) {
    setForm(emptyForm(month, type));
    setTypeFilter(type);
  }

  function edit(item: Transaction) {
    setForm({
      id: item.id,
      title: item.title,
      amount: String(item.amount),
      type: item.type,
      categoryId: item.category_id ? String(item.category_id) : "",
      paymentMethod: item.payment_method,
      transactionDate: item.transaction_date,
      cardId: item.card_id ? String(item.card_id) : "",
      notes: item.notes || "",
      isRecurring: false
    });
    setTypeFilter(item.type);
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Movimentacoes</h1>
            <p className="text-sm text-muted">Separe entradas e despesas sem precisar entender termos tecnicos.</p>
          </div>
          <MonthPicker value={month} onChange={(value) => { setMonth(value); setForm(emptyForm(value, form.type)); }} />
        </header>

        <FirstTimeExplainer
          storageKey="rf_seen_movements_intro"
          title="Entradas e despesas agora ficam mais claras"
          description="Use Nova despesa para gastos e Nova entrada para salario, freelas ou outras receitas. A lista abaixo pode mostrar tudo junto ou separado."
        />

        {message ? <p className="app-card mb-4 p-3 text-sm text-ink">{message}</p> : null}

        <section className="mb-4 grid gap-3 sm:grid-cols-2">
          <button className="focus-ring rounded-app border border-coral/25 bg-coral/10 p-4 text-left shadow-soft" type="button" onClick={() => startNew("expense")}>
            <ArrowDownCircle className="text-coral" size={22} />
            <strong className="mt-2 block">Nova despesa</strong>
            <span className="mt-1 block text-sm text-muted">Gasto, compra, conta ou pagamento feito no mes.</span>
          </button>
          <button className="focus-ring rounded-app border border-leaf/25 bg-leaf/10 p-4 text-left shadow-soft" type="button" onClick={() => startNew("income")}>
            <ArrowUpCircle className="text-leaf" size={22} />
            <strong className="mt-2 block">Nova entrada</strong>
            <span className="mt-1 block text-sm text-muted">Salario, receita extra, freelance ou dinheiro recebido.</span>
          </button>
        </section>

        <form onSubmit={handleSubmit} className="app-card p-4">
          <SectionIntro
            title={form.type === "income" ? "Cadastrar entrada" : "Cadastrar despesa"}
            description={form.type === "income" ? "Registre dinheiro que entrou no mes." : "Registre gastos com descricao, valor, categoria e forma de pagamento."}
            helpText="Entradas aumentam seu saldo. Despesas reduzem o saldo e entram nas metas, categorias e orcamento."
          />
          {form.type === "income" ? (
            <IncomeForm form={form} categories={categories} onChange={setForm} />
          ) : (
            <ExpenseForm form={form} categories={categories} cards={cards} onChange={setForm} />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" type="submit"><Plus size={16} />{form.id ? "Salvar edicao" : form.type === "income" ? "Cadastrar entrada" : "Cadastrar despesa"}</button>
            {form.id ? <button className="btn-secondary" type="button" onClick={() => setForm(emptyForm(month, form.type))}>Cancelar</button> : null}
          </div>
        </form>

        <section className="mt-4">
          <SectionIntro
            title="Lista do mes"
            description="Veja rapidamente o que entrou, o que saiu e de onde veio cada movimentacao."
            helpText="Use as abas para separar despesas, entradas ou conferir tudo junto."
          />
          <MovementTabs value={typeFilter} onChange={setTypeFilter} totals={totals} />
          <div className="app-card mt-3 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <label className="text-sm">
                Buscar
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 text-muted" size={16} />
                  <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descricao" />
                </div>
              </label>
              <label className="text-sm">
                Origem
                <select className="field mt-1" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="">Todas</option>
                  <option value="manual">Manual</option>
                  <option value="csv_import">CSV</option>
                  <option value="open_finance_future">Open Finance futuro</option>
                </select>
              </label>
              <button className="btn-secondary self-end" type="button" onClick={() => load().catch(console.error)}>Filtrar</button>
            </div>

            <div className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <article key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className={item.type === "income" ? "mb-1 inline-flex rounded-app bg-leaf/10 px-2 py-1 text-xs font-semibold text-leaf" : "mb-1 inline-flex rounded-app bg-coral/10 px-2 py-1 text-xs font-semibold text-coral"}>
                      {item.type === "income" ? "Entrada" : "Despesa"}
                    </span>
                    <h2 className="truncate text-sm font-semibold">{item.title}</h2>
                    <p className="text-xs text-muted">{item.transaction_date} / {item.category_name || "Sem categoria"} / {item.payment_method} / {item.source}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <strong className={item.type === "income" ? "text-leaf" : "text-coral"}>{item.type === "income" ? "+" : "-"}{formatBRL(item.amount)}</strong>
                    <button className="btn-secondary h-9 w-9 px-0" type="button" onClick={() => edit(item)} aria-label="Editar"><Pencil size={15} /></button>
                    <button className="btn-secondary h-9 w-9 px-0" type="button" onClick={() => handleDelete(item).catch(console.error)} aria-label="Excluir"><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
              {!items.length ? (
                <div className="py-4">
                  <EmptyState
                    title={typeFilter === "income" ? "Nenhuma entrada lancada ainda" : typeFilter === "expense" ? "Nenhuma despesa lancada ainda" : "Nenhuma movimentacao encontrada"}
                    description={typeFilter === "income" ? "Cadastre seu salario ou uma receita extra para acompanhar o dinheiro que entrou." : "Cadastre seus gastos do mes para entender para onde seu dinheiro esta indo."}
                    actionLabel={typeFilter === "income" ? "Cadastrar entrada" : "Cadastrar despesa"}
                    onAction={() => startNew(typeFilter || "expense")}
                    icon={typeFilter === "income" ? ArrowUpCircle : ArrowDownCircle}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
