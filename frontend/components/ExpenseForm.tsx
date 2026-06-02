"use client";

import type { Card, Category } from "@/types/finance";

export type MovementFormState = {
  id?: number;
  title: string;
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  paymentMethod: string;
  transactionDate: string;
  cardId: string;
  notes: string;
  isRecurring: boolean;
};

type ExpenseFormProps = {
  form: MovementFormState;
  categories: Category[];
  cards: Card[];
  onChange: (form: MovementFormState) => void;
};

export function ExpenseForm({ form, categories, cards, onChange }: ExpenseFormProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">
        Descricao da despesa
        <input className="field mt-1" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required />
      </label>
      <label className="text-sm">
        Valor gasto
        <input className="field mt-1" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} inputMode="decimal" required />
      </label>
      <label className="text-sm">
        Data do gasto
        <input className="field mt-1" type="date" value={form.transactionDate} onChange={(event) => onChange({ ...form, transactionDate: event.target.value })} required />
      </label>
      <label className="text-sm">
        Categoria
        <select className="field mt-1" value={form.categoryId} onChange={(event) => onChange({ ...form, categoryId: event.target.value })}>
          <option value="">Sem categoria</option>
          {categories.filter((category) => category.type === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="text-sm">
        Forma de pagamento
        <select className="field mt-1" value={form.paymentMethod} onChange={(event) => onChange({ ...form, paymentMethod: event.target.value, cardId: event.target.value === "credito" ? form.cardId : "" })}>
          <option value="pix">Pix</option>
          <option value="debito">Debito</option>
          <option value="credito">Credito</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="boleto">Boleto</option>
        </select>
      </label>
      <label className="text-sm">
        Cartao, se for credito
        <select className="field mt-1" value={form.cardId} onChange={(event) => onChange({ ...form, cardId: event.target.value, paymentMethod: event.target.value ? "credito" : form.paymentMethod })}>
          <option value="">Sem cartao</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select>
      </label>
      <label className="text-sm md:col-span-2">
        Observacoes
        <input className="field mt-1" value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
      </label>
    </div>
  );
}
