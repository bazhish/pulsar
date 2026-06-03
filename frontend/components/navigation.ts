import type { LucideIcon } from "lucide-react";
import { CalendarDays, FileText, Home, Layers3, PiggyBank, ReceiptText, Upload, UserRound } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Resumo", icon: Home },
  { href: "/transacoes", label: "Movimentações", icon: ReceiptText },
  { href: "/metas", label: "Metas", icon: CalendarDays },
  { href: "/orcamento", label: "Orçamento", icon: PiggyBank },
  { href: "/parcelas", label: "Parcelas", icon: Layers3 },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/perfil", label: "Perfil", icon: UserRound }
];

export function isActiveNavItem(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname.startsWith("/dashboard");
  return pathname.startsWith(href);
}
