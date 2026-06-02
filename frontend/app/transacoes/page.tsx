"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, Card, Category, Transaction, TransactionType } from "@/types/finance";

type FormState = {
  id?: number;
  title: string;
  amount: string;
  type: TransactionType;
  categoryId: string;
  paymentMethod: string;
  transactionDate: string;
  cardId: string;
  notes: string;
};

const emptyForm = (month: string): FormState => ({
  title: "",
  amount: "",
  type: "expense",
  categoryId: "",
  paymentMethod: "pix",
  transactionDate: `${month}-01`,
  cardId: "",
  notes: ""
});

export default function TransacoesPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [items, setItems] = useState<Transaction[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(month));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
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
    setItems(transactions);
  }, [token, month, search, typeFilter, sourceFilter]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const payload = {
      title: form.title,
      amount: Number(form.amount),
      type: form.type,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      paymentMethod: form.paymentMethod,
      transactionDate: form.transactionDate,
      cardId: form.cardId ? Number(form.cardId) : null,
      billingMonth: form.cardId ? month : null,
      notes: form.notes,
      isRecurring: false
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
      }
      else await api.transaction(token, payload);
      setForm(emptyForm(month));
      setMessage(form.id ? "Lancamento atualizado." : "Lancamento criado.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  }

  async function handleDelete(item: Transaction) {
    if (!token || !window.confirm(`Excluir "${item.title}"?`)) return;
    await api.deleteTransaction(token, item.id);
    setMessage("Lancamento excluido.");
    await load();
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
      notes: item.notes || ""
    });
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transacoes</h1>
            <p className="text-sm text-muted">{items.length} lancamentos em {month}</p>
          </div>
          <MonthPicker value={month} onChange={(value) => { setMonth(value); setForm(emptyForm(value)); }} />
        </header>

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm text-ink shadow-soft">{message}</p> : null}

        <form onSubmit={handleSubmit} className="rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm">
              Descricao
              <input className="field mt-1" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label className="text-sm">
              Valor
              <input className="field mt-1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" required />
            </label>
            <label className="text-sm">
              Tipo
              <select className="field mt-1" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}>
                <option value="expense">Saida</option>
                <option value="income">Entrada</option>
              </select>
            </label>
            <label className="text-sm">
              Data
              <input className="field mt-1" type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} required />
            </label>
            <label className="text-sm">
              Categoria
              <select className="field mt-1" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                <option value="">Sem categoria</option>
                {categories.filter((category) => category.type === form.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Pagamento
              <select className="field mt-1" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
                <option value="pix">Pix</option>
                <option value="debito">Debito</option>
                <option value="credito">Credito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
              </select>
            </label>
            <label className="text-sm">
              Cartao
              <select className="field mt-1" value={form.cardId} onChange={(event) => setForm({ ...form, cardId: event.target.value, paymentMethod: event.target.value ? "credito" : form.paymentMethod })}>
                <option value="">Sem cartao</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Observacoes
              <input className="field mt-1" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" type="submit"><Plus size={16} />{form.id ? "Salvar edicao" : "Criar lancamento"}</button>
            {form.id ? <button className="btn-secondary" type="button" onClick={() => setForm(emptyForm(month))}>Cancelar</button> : null}
          </div>
        </form>

        <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto]">
            <label className="text-sm">
              Buscar
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 text-muted" size={16} />
                <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descricao" />
              </div>
            </label>
            <label className="text-sm">
              Tipo
              <select className="field mt-1" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TransactionType | "")}>
                <option value="">Todos</option>
                <option value="income">Entradas</option>
                <option value="expense">Saidas</option>
              </select>
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
              <article key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{item.title}</h2>
                  <p className="text-xs text-muted">{item.transaction_date} / {item.category_name || "Sem categoria"} / {item.payment_method} / {item.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong className={item.type === "income" ? "text-leaf" : "text-coral"}>{item.type === "income" ? "+" : "-"}{formatBRL(item.amount)}</strong>
                  <button className="btn-secondary h-9 w-9 px-0" type="button" onClick={() => edit(item)} aria-label="Editar"><Pencil size={15} /></button>
                  <button className="btn-secondary h-9 w-9 px-0" type="button" onClick={() => handleDelete(item).catch(console.error)} aria-label="Excluir"><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
            {!items.length ? <p className="py-8 text-center text-sm text-muted">Nenhum lancamento encontrado.</p> : null}
          </div>
        </section>
      </div>
    </Shell>
  );
}
