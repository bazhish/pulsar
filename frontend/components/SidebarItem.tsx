"use client";

import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import type { NavItem } from "@/components/navigation";

type SidebarItemProps = {
  active: boolean;
  compact: boolean;
  item: NavItem;
};

export function SidebarItem({ active, compact, item }: SidebarItemProps) {
  const Icon = item.icon;
  const link = (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={compact ? item.label : undefined}
      className={`focus-ring interactive-list-item group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-app px-3 py-2.5 text-sm font-bold transition ${
        active ? "bg-pulse text-white shadow-soft" : "text-ink/70 hover:bg-pulse/10 hover:text-ink"
      } ${compact ? "justify-center px-2" : ""}`}
      href={item.href}
    >
      {active ? <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-white/70" aria-hidden /> : null}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-app transition ${active ? "bg-white/20 text-white" : "bg-ink/5 text-ink/70 group-hover:bg-pulse group-hover:text-white"}`}>
        <Icon size={18} aria-hidden />
      </span>
      {compact ? null : <span className="min-w-0 truncate">{item.label}</span>}
    </Link>
  );

  return (
    <Tooltip disabled={!compact} label={item.label} side="right">
      {link}
    </Tooltip>
  );
}
