"use client";

import type { MovementFormState } from "@/components/ExpenseForm";
import type { Category } from "@/types/finance";

type IncomeFormProps = {
  form: MovementFormState;
  categories: Category[];
  onChange: (form: MovementFormState) => void;
};

export function IncomeForm({ form, categories, onChange }: IncomeFormProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">
        Descricao da entrada
        <input className="field mt-1" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Salario, freelance, receita extra" required />
      </label>
      <label className="text-sm">
        Valor recebido
        <input className="field mt-1" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} inputMode="decimal" required />
      </label>
      <label className="text-sm">
        Data da entrada
        <input className="field mt-1" type="date" value={form.transactionDate} onChange={(event) => onChange({ ...form, transactionDate: event.target.value })} required />
      </label>
      <label className="text-sm">
        Categoria
        <select className="field mt-1" value={form.categoryId} onChange={(event) => onChange({ ...form, categoryId: event.target.value })}>
          <option value="">Sem categoria</option>
          {categories.filter((category) => category.type === "income").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isRecurring} onChange={(event) => onChange({ ...form, isRecurring: event.target.checked })} />
        Entrada recorrente
      </label>
      <label className="text-sm md:col-span-2 xl:col-span-3">
        Observacoes
        <input className="field mt-1" value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
      </label>
    </div>
  );
}
