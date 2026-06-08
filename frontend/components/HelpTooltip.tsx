"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useDelayedPresence } from "@/lib/useDelayedPresence";

type HelpTooltipProps = {
  title?: string;
  text: string;
};

export function HelpTooltip({ title = "Como funciona", text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const { shouldRender, state } = useDelayedPresence(open, 150);

  return (
    <span className="relative inline-flex">
      <button
        className="focus-ring theme-control inline-flex h-8 w-8 items-center justify-center rounded-app border text-muted shadow-sm hover:text-ink"
        type="button"
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <HelpCircle size={16} />
      </button>
      {shouldRender ? (
        <span className={`theme-surface absolute right-0 top-10 z-20 w-64 rounded-app border p-3 text-left text-sm text-ink shadow-lift backdrop-blur ${state === "open" ? "animate-dropdown-in" : "animate-dropdown-out"}`}>
          <strong className="block text-xs uppercase tracking-normal text-muted">{title}</strong>
          <span className="mt-1 block">{text}</span>
        </span>
      ) : null}
    </span>
  );
}
