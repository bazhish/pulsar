"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { Select } from "@/components/Select";
import { CreateCategoryDrawer, type CreateCategoryInput } from "@/components/CreateCategoryDrawer";
import type { Category } from "@/types/finance";

export type MovementFormState = {
  id?: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  paymentMethod: string;
  transactionDate: string;
  cardId: string;
  notes: string;
  isRecurring: boolean;
  installments?: number;
  interestRate?: number;
  firstInstallmentDate?: string;
};

type ExpenseFormProps = {
  form: MovementFormState;
  categories: Category[];
  onChange: (form: MovementFormState) => void;
  onCreateCategory?: (category: CreateCategoryInput) => Promise<void>;
};

const paymentMethods = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" }
];

export function ExpenseForm({
  form,
  categories,
  onChange,
  onCreateCategory
}: ExpenseFormProps) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const isCredit = form.paymentMethod === "credito";

  async function handleCreateCategory(category: CreateCategoryInput) {
    if (onCreateCategory) {
      await onCreateCategory(category);
    }
    // Auto-select the new category
    const newCategories = [...expenseCategories, {
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
          <span className="font-semibold text-ink">Nome da despesa</span>
          <input
            className="field mt-1"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="Ex: Supermercado, Combustível"
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-semibold text-ink">Valor</span>
          <MoneyInput
            className="field mt-1"
            value={form.amount}
            onValueChange={(amount) => onChange({ ...form, amount })}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-semibold text-ink">Data da despesa</span>
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
                ...expenseCategories.map((c) => ({
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

        <label className="text-sm">
          <span className="font-semibold text-ink">Forma de pagamento</span>
          <Select
            value={form.paymentMethod}
            onChange={(value) => onChange({ ...form, paymentMethod: String(value), cardId: "" })}
            options={paymentMethods}
            placeholder="Selecione o pagamento"
            className="mt-1"
          />
        </label>

        {isCredit && (
          <>
            <label className="text-sm">
              <span className="font-semibold text-ink">Parcelado?</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...form, installments: 1 })}
                  className={`p-2 rounded-app border-2 text-sm font-semibold transition ${
                    (form.installments ?? 1) === 1
                      ? "border-plum bg-plum/10 text-plum"
                      : "border-line bg-white hover:bg-white/75"
                  }`}
                >
                  À vista
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...form, installments: 2 })}
                  className={`p-2 rounded-app border-2 text-sm font-semibold transition ${
                    (form.installments ?? 1) > 1
                      ? "border-plum bg-plum/10 text-plum"
                      : "border-line bg-white hover:bg-white/75"
                  }`}
                >
                  Parcelado
                </button>
              </div>
            </label>

            {(form.installments ?? 1) > 1 && (
              <>
                <label className="text-sm">
                  <span className="font-semibold text-ink">Número de parcelas</span>
                  <input
                    className="field mt-1"
                    type="number"
                    min="2"
                    max="36"
                    value={form.installments ?? 2}
                    onChange={(event) =>
                      onChange({ ...form, installments: Math.max(2, parseInt(event.target.value) || 2) })
                    }
                  />
                </label>

                <label className="text-sm">
                  <span className="font-semibold text-ink">Juros (%)</span>
                  <input
                    className="field mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.interestRate ?? ""}
                    onChange={(event) =>
                      onChange({ ...form, interestRate: parseFloat(event.target.value) || 0 })
                    }
                  />
                </label>

                <label className="text-sm">
                  <span className="font-semibold text-ink">Primeira parcela em</span>
                  <input
                    className="field mt-1"
                    type="date"
                    value={form.firstInstallmentDate ?? form.transactionDate}
                    onChange={(event) => onChange({ ...form, firstInstallmentDate: event.target.value })}
                  />
                </label>
              </>
            )}
          </>
        )}

        <label className="text-sm md:col-span-2">
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
        defaultType="expense"
      />
    </>
  );
}
