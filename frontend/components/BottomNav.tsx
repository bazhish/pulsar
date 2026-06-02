"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, CreditCard, UserRound } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/metas", label: "Metas", icon: CalendarDays },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/perfil", label: "Perfil", icon: UserRound }
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-black/10 bg-white lg:hidden">
      {links.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2 py-2 text-xs">
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
