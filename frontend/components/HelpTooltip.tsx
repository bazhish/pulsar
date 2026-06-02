"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

type HelpTooltipProps = {
  title?: string;
  text: string;
};

export function HelpTooltip({ title = "Como funciona", text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-app border border-line bg-white text-muted hover:text-ink"
        type="button"
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <HelpCircle size={16} />
      </button>
      {open ? (
        <span className="absolute right-0 top-10 z-20 w-64 rounded-app border border-line bg-white p-3 text-left text-sm text-ink shadow-lift">
          <strong className="block text-xs uppercase tracking-normal text-muted">{title}</strong>
          <span className="mt-1 block">{text}</span>
        </span>
      ) : null}
    </span>
  );
}
