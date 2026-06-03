"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { Select } from "@/components/Select";
import { CreateCategoryDrawer, type CreateCategoryInput } from "@/components/CreateCategoryDrawer";
import type { MovementFormState } from "@/components/ExpenseForm";
import type { Category } from "@/types/finance";

type IncomeFormProps = {
  form: MovementFormState;
  categories: Category[];
  onChange: (form: MovementFormState) => void;
  onCreateCategory?: (category: CreateCategoryInput) => Promise<void>;
};

export function IncomeForm({
  form,
  categories,
  onChange,
  onCreateCategory
}: IncomeFormProps) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const incomeCategories = categories.filter((c) => c.type === "income");

  async function handleCreateCategory(category: CreateCategoryInput) {
    if (onCreateCategory) {
      await onCreateCategory(category);
    }
    // Auto-select the new category
    const newCategories = [...incomeCategories, {
      id: Math.random(),
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon
    }];
    const newCategory = newCategories[newCategories.length - 1];
    onChange({ ...form, categoryId: String(newCategory.id) });
    setShowCreateCategory(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">
          <span className="font-semibold text-ink">Nome da entrada</span>
          <input
            className="field mt-1"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="Ex: Salário, Freelance, Reembolso"
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-semibold text-ink">Valor recebido</span>
          <MoneyInput
            className="field mt-1"
            value={form.amount}
            onValueChange={(amount) => onChange({ ...form, amount })}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-semibold text-ink">Data da entrada</span>
          <input
            className="field mt-1"
            type="date"
            value={form.transactionDate}
            onChange={(event) => onChange({ ...form, transactionDate: event.target.value })}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-semibold text-ink">Categoria</span>
          <div className="mt-1 flex gap-2">
            <Select
              value={form.categoryId}
              onChange={(value) => onChange({ ...form, categoryId: String(value) })}
              options={[
                { value: "", label: "Sem categoria" },
                ...incomeCategories.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  color: c.color
                }))
              ]}
              placeholder="Selecione a categoria"
              clearable
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setShowCreateCategory(true)}
              className="btn-secondary h-auto px-3"
              title="Criar nova categoria"
              aria-label="Criar nova categoria"
            >
              <Plus size={16} />
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm col-span-full md:col-span-1">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(event) => onChange({ ...form, isRecurring: event.target.checked })}
            className="h-4 w-4"
          />
          <span className="font-semibold text-ink">Entrada recorrente</span>
        </label>

        <label className="text-sm md:col-span-2 xl:col-span-3">
          <span className="font-semibold text-ink">Descrição/Observações</span>
          <input
            className="field mt-1"
            value={form.notes}
            onChange={(event) => onChange({ ...form, notes: event.target.value })}
            placeholder="Detalhes adicionais (opcional)"
          />
        </label>
      </div>

      <CreateCategoryDrawer
        open={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        onSubmit={handleCreateCategory}
        defaultType="income"
      />
    </>
  );
}
