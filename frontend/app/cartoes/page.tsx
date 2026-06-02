"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calculator, CreditCard, Plus } from "lucide-react";
import { CardSummary } from "@/components/CardSummary";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Card, Category } from "@/types/finance";

type Projection = Array<{ month: string; currentInvoice: number; simulatedInstallment: number; projectedTotal: number }>;

export default function CartoesPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [projection, setProjection] = useState<Projection>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const [boot, nextCards] = await Promise.all([api.bootstrap(token, month), api.cards(token, month)]);
    setCategories(boot.categories.filter((category) => category.type === "expense"));
    setCards(nextCards);
  }, [token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  async function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.createCard(token, {
      name: String(form.get("name")),
      brand: String(form.get("brand")),
      lastFour: String(form.get("lastFour")),
      creditLimit: Number(form.get("creditLimit")),
      closingDay: Number(form.get("closingDay")),
      dueDay: Number(form.get("dueDay")),
      color: String(form.get("color") || "#111827")
    });
    event.currentTarget.reset();
    setMessage("Cartao cadastrado.");
    await load();
  }

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const cardId = Number(form.get("cardId"));
    const response = await api.purchaseSimulation(token, cardId, {
      totalAmount: Number(form.get("totalAmount")),
      totalInstallments: Number(form.get("totalInstallments")),
      purchaseDate: String(form.get("purchaseDate")),
      months: 12
    });
    setProjection(response.projection);
  }

  async function createInstallmentPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.createInstallments(token, Number(form.get("cardId")), {
      title: String(form.get("title")),
      categoryId: form.get("categoryId") ? Number(form.get("categoryId")) : null,
      totalAmount: Number(form.get("totalAmount")),
      totalInstallments: Number(form.get("totalInstallments")),
      purchaseDate: String(form.get("purchaseDate")),
      notes: ""
    });
    setMessage("Compra parcelada criada.");
    await load();
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><CreditCard size={24} /> Cartoes</h1>
            <p className="text-sm text-muted">Faturas, limite e parcelas de {month}</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <CardSummary key={card.id} card={card} />)}
          {!cards.length ? <p className="rounded-app border border-line bg-white p-4 text-sm text-muted shadow-soft">Nenhum cartao cadastrado.</p> : null}
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={createCard} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 font-semibold">Cadastrar cartao</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" name="name" placeholder="Nome" required />
              <input className="field" name="brand" placeholder="Bandeira" required />
              <input className="field" name="lastFour" placeholder="Ultimos 4 digitos" maxLength={4} required />
              <input className="field" name="creditLimit" placeholder="Limite" inputMode="decimal" required />
              <input className="field" name="closingDay" placeholder="Fechamento" inputMode="numeric" required />
              <input className="field" name="dueDay" placeholder="Vencimento" inputMode="numeric" required />
              <input className="field" name="color" type="color" defaultValue="#111827" aria-label="Cor" />
            </div>
            <button className="btn-primary mt-4" type="submit"><Plus size={16} />Salvar cartao</button>
          </form>

          <form onSubmit={simulate} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Calculator size={18} /> Simular compra</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="field" name="cardId" required>
                <option value="">Cartao</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select>
              <input className="field" name="totalAmount" placeholder="Valor total" inputMode="decimal" required />
              <input className="field" name="totalInstallments" placeholder="Parcelas" inputMode="numeric" required />
              <input className="field" name="purchaseDate" type="date" defaultValue={`${month}-01`} required />
            </div>
            <button className="btn-secondary mt-4" type="submit">Simular faturas</button>
          </form>
        </section>

        <form onSubmit={createInstallmentPurchase} className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <h2 className="mb-3 font-semibold">Criar compra parcelada</h2>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select className="field" name="cardId" required>
              <option value="">Cartao</option>
              {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
            <input className="field" name="title" placeholder="Descricao" required />
            <select className="field" name="categoryId">
              <option value="">Categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="field" name="totalAmount" placeholder="Valor total" inputMode="decimal" required />
            <input className="field" name="totalInstallments" placeholder="Parcelas" inputMode="numeric" required />
            <input className="field" name="purchaseDate" type="date" defaultValue={`${month}-01`} required />
          </div>
          <button className="btn-primary mt-4" type="submit"><Plus size={16} />Criar parcelas</button>
        </form>

        {projection.length ? (
          <section className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
            <h2 className="font-semibold">Impacto futuro</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {projection.slice(0, 8).map((item) => (
                <div key={item.month} className="rounded-app border border-line p-3 text-sm">
                  <strong>{item.month}</strong>
                  <span className="mt-1 block text-muted">Parcela: {formatBRL(item.simulatedInstallment)}</span>
                  <span className="block">Fatura: {formatBRL(item.projectedTotal)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
