"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleDollarSign } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, actionLabel, href, onAction, icon: Icon = CircleDollarSign }: EmptyStateProps) {
  const action = actionLabel ? (
    href ? (
      <Link className="btn-primary mt-4" href={href}>
        {actionLabel}
      </Link>
    ) : (
      <button className="btn-primary mt-4" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="animate-rise-in rounded-app border border-dashed border-pulse/30 bg-gradient-to-br from-surface to-mint/70 p-5 text-center shadow-soft">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-app border border-line bg-surface text-pulse shadow-soft transition hover:scale-105">
        <Icon size={22} />
      </div>
      <h3 className="animate-text-reveal mt-3 text-base font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
