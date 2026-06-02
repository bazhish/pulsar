"use client";

import Link from "next/link";
import { CalendarDays, CreditCard, Home, PiggyBank, ReceiptText } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Resumo", icon: Home },
  { href: "/transacoes", label: "Movimentos", icon: ReceiptText },
  { href: "/metas", label: "Metas", icon: CalendarDays },
  { href: "/orcamento", label: "Orcamento", icon: PiggyBank },
  { href: "/cartoes", label: "Cartoes", icon: CreditCard }
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Principal">
      {links.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold text-ink/70">
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
