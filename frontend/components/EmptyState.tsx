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
    <div className="rounded-app border border-dashed border-line bg-white p-5 text-center shadow-soft">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-app bg-pulse/10 text-pulse">
        <Icon size={22} />
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
