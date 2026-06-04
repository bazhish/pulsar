"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent, PointerEvent } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { SidebarItem } from "@/components/SidebarItem";
import { Tooltip } from "@/components/Tooltip";
import { UserMenu } from "@/components/UserMenu";
import { isActiveNavItem, mainNavItems } from "@/components/navigation";

type SidebarProps = {
  compact?: boolean;
  expandedWidth?: number;
  onResizeKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onResizeStart?: (event: PointerEvent<HTMLDivElement>) => void;
  onToggleCompact?: () => void;
  width?: number;
};

export function Sidebar({ compact = false, expandedWidth = 280, onResizeKeyDown, onResizeStart, onToggleCompact, width = expandedWidth }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="theme-surface relative hidden h-screen min-h-0 border-r shadow-soft backdrop-blur lg:sticky lg:top-0 lg:flex lg:flex-col"
      style={{ width }}
    >
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 ${compact ? "items-center" : ""}`}>
        <div className={`mb-6 flex w-full items-center gap-2 ${compact ? "justify-center" : "justify-between"}`}>
          <Tooltip disabled={!compact} label="Pulsar" side="right">
            <Link
              aria-label={compact ? "Ir para o Resumo" : undefined}
              className={`focus-ring flex min-w-0 items-center gap-3 rounded-app border border-line bg-gradient-to-br from-mint/85 to-surface p-2 shadow-sm ${compact ? "justify-center" : "flex-1"}`}
              href="/dashboard"
            >
              <Image src="/logo-mark.svg" width={compact ? 34 : 40} height={compact ? 34 : 40} alt="" aria-hidden />
              {compact ? null : (
                <span className="min-w-0">
                  <strong className="block truncate leading-tight text-ink">Pulsar</strong>
                  <small className="block truncate text-muted">Seu dinheiro no ritmo</small>
                </span>
              )}
            </Link>
          </Tooltip>
          {onToggleCompact ? (
            <IconButton
              className={compact ? "hidden" : ""}
              icon={compact ? PanelLeftOpen : PanelLeftClose}
              label={compact ? "Expandir sidebar" : "Compactar sidebar"}
              onClick={onToggleCompact}
            />
          ) : null}
        </div>

        {compact && onToggleCompact ? (
          <IconButton className="mb-4" icon={PanelLeftOpen} label="Expandir sidebar" onClick={onToggleCompact} />
        ) : null}

        <nav className={`w-full space-y-1 ${compact ? "flex flex-col items-center" : ""}`} aria-label="Principal">
          {mainNavItems.map((item) => (
            <SidebarItem active={isActiveNavItem(pathname, item.href)} compact={compact} item={item} key={item.href} />
          ))}
        </nav>

        <div className="mt-auto w-full pt-4">
          <UserMenu compact={compact} />
        </div>
      </div>

      <div
        aria-label="Redimensionar sidebar"
        aria-orientation="vertical"
        aria-valuemax={360}
        aria-valuemin={84}
        aria-valuenow={Math.round(width)}
        className="absolute inset-y-0 right-0 w-3 cursor-col-resize touch-none outline-none after:absolute after:inset-y-4 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition focus-visible:after:bg-pulse hover:after:bg-pulse/60"
        onKeyDown={onResizeKeyDown}
        onPointerDown={onResizeStart}
        role="separator"
        tabIndex={0}
      />
    </aside>
  );
}
