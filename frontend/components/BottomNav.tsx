"use client";

import Link from "next/link";
import Image from "next/image";
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
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-app border border-white/80 bg-white/95 shadow-lift backdrop-blur lg:hidden" aria-label="Principal">
      {links.map((item) => {
        const Icon = item.icon;
        const isHome = item.href === "/dashboard";
        return (
          <Link key={item.href} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold text-ink/70">
            {isHome ? <Image src="/logo-mark.svg" width={20} height={20} alt="" aria-hidden /> : <Icon size={19} />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
