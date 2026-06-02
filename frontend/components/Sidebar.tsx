"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, CreditCard, UserRound } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/metas", label: "Metas", icon: CalendarDays },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/perfil", label: "Perfil", icon: UserRound }
];

export function Sidebar() {
  return (
    <aside className="hidden border-r border-black/10 bg-white/70 px-4 py-5 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded bg-ink text-sm font-bold text-white">RF</span>
        <span>
          <strong className="block leading-tight">Ritmo Financeiro</strong>
          <small className="text-black/55">Controle pessoal</small>
        </span>
      </Link>
      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5"
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
