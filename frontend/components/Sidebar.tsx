"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CreditCard, FileText, Home, PiggyBank, ReceiptText, Upload, UserRound } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Resumo", icon: Home },
  { href: "/transacoes", label: "Movimentacoes", icon: ReceiptText },
  { href: "/metas", label: "Metas", icon: CalendarDays },
  { href: "/orcamento", label: "Orcamento", icon: PiggyBank },
  { href: "/cartoes", label: "Cartoes", icon: CreditCard },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
  { href: "/perfil", label: "Perfil", icon: UserRound }
];

export function Sidebar() {
  return (
    <aside className="hidden border-r border-white/70 bg-white/85 px-4 py-5 shadow-soft backdrop-blur lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-app bg-gradient-to-br from-mint to-white p-3">
        <Image src="/logo-mark.svg" width={42} height={42} alt="Ritmo Financeiro Pro" />
        <span>
          <strong className="block leading-tight text-ink">Ritmo Financeiro</strong>
          <small className="text-muted">Seu dinheiro no ritmo</small>
        </span>
      </Link>
      <nav className="space-y-1" aria-label="Principal">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-app px-3 py-3 text-sm font-bold text-ink/70 transition hover:bg-pulse/10 hover:text-ink"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-app bg-ink/5 text-ink/70 transition group-hover:bg-pulse group-hover:text-white">
                <Icon size={18} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
