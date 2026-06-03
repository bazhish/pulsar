"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavItem, mainNavItems } from "@/components/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden" aria-label="Principal">
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-app border border-white/80 bg-white/95 p-1 shadow-lift backdrop-blur">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveNavItem(pathname, item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex min-h-14 min-w-[74px] flex-col items-center justify-center gap-1 rounded-app px-2 py-2 text-[10px] font-bold transition ${active ? "bg-pulse text-white" : "text-ink/70 hover:bg-pulse/10 hover:text-ink"}`}
              href={item.href}
              key={item.href}
            >
              <Icon size={18} aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
