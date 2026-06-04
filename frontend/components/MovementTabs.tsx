"use client";

import type { TransactionType } from "@/types/finance";

type MovementTabsProps = {
  value: TransactionType | "";
  onChange: (value: TransactionType | "") => void;
  totals: {
    expense: number;
    income: number;
    all: number;
  };
};

const tabs: Array<{ value: TransactionType | ""; label: string; helper: string }> = [
  { value: "expense", label: "Despesas", helper: "Gastos do mês" },
  { value: "income", label: "Entradas", helper: "Dinheiro que entrou" },
  { value: "", label: "Todas", helper: "Tudo junto" }
];

export function MovementTabs({ value, onChange, totals }: MovementTabsProps) {
  return (
    <div className="theme-surface grid grid-cols-3 gap-2 rounded-app border p-1 shadow-soft backdrop-blur">
      {tabs.map((tab) => {
        const active = value === tab.value;
        const count = tab.value === "expense" ? totals.expense : tab.value === "income" ? totals.income : totals.all;
        return (
          <button
            key={tab.label}
            className={`focus-ring rounded-app px-2 py-3 text-left text-sm transition ${active ? "bg-gradient-to-r from-pulse to-plum text-white shadow-soft" : "theme-control text-ink hover:border-pulse/50"}`}
            type="button"
            onClick={() => onChange(tab.value)}
          >
            <span className="block font-semibold">{tab.label}</span>
            <span className={active ? "mt-1 block text-xs text-white/70" : "mt-1 block text-xs text-muted"}>{count} itens</span>
          </button>
        );
      })}
    </div>
  );
}
