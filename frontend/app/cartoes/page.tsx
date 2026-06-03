"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calculator, CreditCard, Plus } from "lucide-react";
import { CardSummary } from "@/components/CardSummary";
import { CreditCardEducationCard } from "@/components/CreditCardEducationCard";
import { EmptyState } from "@/components/EmptyState";
import { FirstTimeExplainer } from "@/components/FirstTimeExplainer";
import { MoneyInput } from "@/components/MoneyInput";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { parseApiMoneyValue } from "@/lib/money";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Card, Category } from "@/types/finance";

type Projection = Array<{ month: string; currentInvoice: number; simulatedInstallment: number; projectedTotal: number }>;

function asNumber(value: FormDataEntryValue | null) {
  return parseApiMoneyValue(String(value || "0"));
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
    setMessage("Cartão cadastrado.");
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
        <PageHeader
          actions={<MonthPicker value={month} onChange={setMonth} />}
          description="Controle fatura, limite e parcelas futuras sem abrir o app do banco toda hora."
          icon={CreditCard}
          title="Parcelas"
        />

        <FirstTimeExplainer
          storageKey="rf_seen_cards_intro"
          title="Cartões aqui são para planejamento"
          description="O Ritmo não processa pagamentos. Ele usa apenas dados básicos para mostrar fatura, limite disponível e impacto de parcelas."
        />

        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}

        <CreditCardEducationCard />

        <section className="mt-4">
          <SectionIntro
            title="Seus cartões"
            description="Acompanhe fatura atual, limite disponível, limite usado, vencimento, fechamento e parcelas ativas."
            helpText="Use os últimos 4 dígitos apenas para reconhecer o cartão. Nunca cadastre número completo ou CVV."
          />
          {cards.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => <CardSummary key={card.id} card={card} />)}
            </div>
          ) : (
            <EmptyState
              title="Nenhum cartão cadastrado"
              description="Cadastre um cartão informando apenas nome, bandeira, últimos 4 dígitos, limite, fechamento e vencimento."
              actionLabel="Cadastrar cartão"
              onAction={() => document.querySelector<HTMLInputElement>("input[name='name']")?.focus()}
              icon={CreditCard}
            />
          )}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={createCard} className="app-card p-4">
            <SectionIntro
              title="Cadastrar cartão"
              description="Use dados de identificação e calendário da fatura."
              helpText="Fechamento é o dia em que a fatura fecha. Vencimento é o dia em que ela precisa ser paga."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Nome<input className="field mt-1" name="name" placeholder="Ex: Nubank" required /></label>
              <label className="text-sm">Bandeira<input className="field mt-1" name="brand" placeholder="Visa, Mastercard..." required /></label>
              <label className="text-sm">Últimos 4 dígitos<input className="field mt-1" name="lastFour" placeholder="1234" maxLength={4} inputMode="numeric" required /></label>
              <label className="text-sm">Limite<MoneyInput className="field mt-1" name="creditLimit" required /></label>
              <label className="text-sm">Fechamento<input className="field mt-1" name="closingDay" placeholder="7" inputMode="numeric" required /></label>
              <label className="text-sm">Vencimento<input className="field mt-1" name="dueDay" placeholder="14" inputMode="numeric" required /></label>
              <label className="text-sm">Cor<input className="field mt-1 h-10" name="color" type="color" defaultValue="#111827" aria-label="Cor" /></label>
            </div>
            <button className="btn-primary mt-4" type="submit"><Plus size={16} />Salvar cartão</button>
          </form>

          <form onSubmit={simulate} className="app-card p-4">
            <SectionIntro
              title="Simular compra"
              description="Veja como uma compra parcelada impactaria suas próximas faturas antes de comprar."
              helpText="A simulação não salva nada. Ela só mostra o impacto estimado nas faturas futuras."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Cartão<select className="field mt-1" name="cardId" required>
                <option value="">Selecione</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select></label>
              <label className="text-sm">Valor total<MoneyInput className="field mt-1" name="totalAmount" required /></label>
              <label className="text-sm">Parcelas<input className="field mt-1" name="totalInstallments" inputMode="numeric" required /></label>
              <label className="text-sm">Data da compra<input className="field mt-1" name="purchaseDate" type="date" defaultValue={`${month}-01`} required /></label>
            </div>
            <button className="btn-secondary mt-4" type="submit"><Calculator size={16} />Simular faturas</button>
          </form>
        </section>

        <form onSubmit={createInstallmentPurchase} className="app-card mt-4 p-4">
          <SectionIntro
            title="Adicionar compra parcelada"
            description="Salve uma compra real para ela aparecer nas faturas futuras do cartão."
            helpText="O valor total é dividido em parcelas. A última parcela ajusta os centavos quando necessário."
          />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select className="field" name="cardId" required>
              <option value="">Cartão</option>
              {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
            <input className="field" name="title" placeholder="Descrição" required />
            <select className="field" name="categoryId">
              <option value="">Categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <MoneyInput className="field" name="totalAmount" aria-label="Valor total" required />
            <input className="field" name="totalInstallments" placeholder="Parcelas" inputMode="numeric" required />
            <input className="field" name="purchaseDate" type="date" defaultValue={`${month}-01`} required />
          </div>
          <button className="btn-primary mt-4" type="submit"><Plus size={16} />Criar parcelas</button>
        </form>

        {projection.length ? (
          <section className="app-card mt-4 p-4">
            <SectionIntro
              title="Impacto futuro"
              description="Veja como essa compra aparece nas próximas faturas."
              helpText="Compare o total projetado com seu limite e com o restante do mês antes de decidir comprar."
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
