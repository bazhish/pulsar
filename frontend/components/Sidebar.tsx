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
    <aside className="hidden border-r border-line bg-white px-4 py-5 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <Image src="/logo-mark.svg" width={42} height={42} alt="Ritmo Financeiro Pro" />
        <span>
          <strong className="block leading-tight">Ritmo Financeiro</strong>
          <small className="text-muted">Organizacao simples</small>
        </span>
      </Link>
      <nav className="space-y-1" aria-label="Principal">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-app px-3 py-2 text-sm font-medium text-ink/75 hover:bg-ink/5"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
