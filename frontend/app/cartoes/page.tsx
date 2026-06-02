"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calculator, CreditCard, Plus } from "lucide-react";
import { CardSummary } from "@/components/CardSummary";
import { CreditCardEducationCard } from "@/components/CreditCardEducationCard";
import { EmptyState } from "@/components/EmptyState";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { MonthPicker } from "@/components/MonthPicker";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Card, Category } from "@/types/finance";

type Projection = Array<{ month: string; currentInvoice: number; simulatedInstallment: number; projectedTotal: number }>;

function asNumber(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(",", "."));
}

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
      creditLimit: asNumber(form.get("creditLimit")),
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
      totalAmount: asNumber(form.get("totalAmount")),
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
      totalAmount: asNumber(form.get("totalAmount")),
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
            <p className="text-sm text-muted">Controle fatura, limite e parcelas futuras sem abrir o app do banco toda hora.</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>

        <FirstTimeExplainer
          storageKey="rf_seen_cards_intro"
          title="Cartoes aqui sao para planejamento"
          description="O Ritmo nao processa pagamentos. Ele usa apenas dados basicos para mostrar fatura, limite disponivel e impacto de parcelas."
        />

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}

        <CreditCardEducationCard />

        <section className="mt-4">
          <SectionIntro
            title="Seus cartoes"
            description="Acompanhe fatura atual, limite disponivel, limite usado, vencimento, fechamento e parcelas ativas."
            helpText="Use os ultimos 4 digitos apenas para reconhecer o cartao. Nunca cadastre numero completo ou CVV."
          />
          {cards.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => <CardSummary key={card.id} card={card} />)}
            </div>
          ) : (
            <EmptyState
              title="Nenhum cartao cadastrado"
              description="Cadastre um cartao informando apenas nome, bandeira, ultimos 4 digitos, limite, fechamento e vencimento."
              actionLabel="Cadastrar cartao"
              onAction={() => document.querySelector<HTMLInputElement>("input[name='name']")?.focus()}
              icon={CreditCard}
            />
          )}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={createCard} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <SectionIntro
              title="Cadastrar cartao"
              description="Use dados de identificacao e calendario da fatura."
              helpText="Fechamento e o dia em que a fatura fecha. Vencimento e o dia em que ela precisa ser paga."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Nome<input className="field mt-1" name="name" placeholder="Ex: Nubank" required /></label>
              <label className="text-sm">Bandeira<input className="field mt-1" name="brand" placeholder="Visa, Mastercard..." required /></label>
              <label className="text-sm">Ultimos 4 digitos<input className="field mt-1" name="lastFour" placeholder="1234" maxLength={4} inputMode="numeric" required /></label>
              <label className="text-sm">Limite<input className="field mt-1" name="creditLimit" placeholder="3000" inputMode="decimal" required /></label>
              <label className="text-sm">Fechamento<input className="field mt-1" name="closingDay" placeholder="7" inputMode="numeric" required /></label>
              <label className="text-sm">Vencimento<input className="field mt-1" name="dueDay" placeholder="14" inputMode="numeric" required /></label>
              <label className="text-sm">Cor<input className="field mt-1 h-10" name="color" type="color" defaultValue="#111827" aria-label="Cor" /></label>
            </div>
            <button className="btn-primary mt-4" type="submit"><Plus size={16} />Salvar cartao</button>
          </form>

          <form onSubmit={simulate} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <SectionIntro
              title="Simular compra"
              description="Veja como uma compra parcelada impactaria suas proximas faturas antes de comprar."
              helpText="A simulacao nao salva nada. Ela so mostra o impacto estimado nas faturas futuras."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Cartao<select className="field mt-1" name="cardId" required>
                <option value="">Selecione</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select></label>
              <label className="text-sm">Valor total<input className="field mt-1" name="totalAmount" inputMode="decimal" required /></label>
              <label className="text-sm">Parcelas<input className="field mt-1" name="totalInstallments" inputMode="numeric" required /></label>
              <label className="text-sm">Data da compra<input className="field mt-1" name="purchaseDate" type="date" defaultValue={`${month}-01`} required /></label>
            </div>
            <button className="btn-secondary mt-4" type="submit"><Calculator size={16} />Simular faturas</button>
          </form>
        </section>

        <form onSubmit={createInstallmentPurchase} className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <SectionIntro
            title="Adicionar compra parcelada"
            description="Salve uma compra real para ela aparecer nas faturas futuras do cartao."
            helpText="O valor total e dividido em parcelas. A ultima parcela ajusta os centavos quando necessario."
          />
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
            <SectionIntro
              title="Impacto futuro"
              description="Veja como essa compra aparece nas proximas faturas."
              helpText="Compare o total projetado com seu limite e com o restante do mes antes de decidir comprar."
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
