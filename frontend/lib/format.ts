const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number) {
  return brlFormatter.format(value || 0).replace(/[\u00a0\u202f]/g, " ");
}
