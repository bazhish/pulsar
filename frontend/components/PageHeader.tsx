"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { HowItWorks } from "@/components/HowItWorks";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  helpText?: string;
  icon?: LucideIcon;
  media?: ReactNode;
  title: ReactNode;
};

export function PageHeader({ actions, description, helpText, icon: Icon, media, title }: PageHeaderProps) {
  return (
    <header className="animate-rise-in mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {media ? media : Icon ? (
          <span className="theme-control flex h-11 w-11 shrink-0 items-center justify-center rounded-app border text-pulse shadow-soft transition hover:scale-105">
            <Icon size={22} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-ink">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {actions || helpText ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {helpText ? <HowItWorks text={helpText} /> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
