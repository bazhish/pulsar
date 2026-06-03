const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export const MONEY_INPUT_PATTERN = "centavos";

function normalizeCurrencySpacing(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

export function centsFromText(text: string): number {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function formatMoneyInput(value: number | null | undefined): string {
  return normalizeCurrencySpacing(brlFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0));
}

export function moneyToApiValue(value: number | null | undefined): number {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(safeValue * 100) / 100;
}

export function parseApiMoneyValue(value: string | number | null | undefined): number {
  if (typeof value === "number") return moneyToApiValue(value);
  if (!value) return 0;
  if (/[R$\s.]/.test(value) || value.includes(",")) return moneyToApiValue(centsFromText(value));
  return moneyToApiValue(Number(value));
}
