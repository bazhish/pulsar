"use client";

import { useId, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { IconButton } from "@/components/IconButton";

type HowItWorksProps = {
  title?: string;
  text: string;
};

export function HowItWorks({ title = "Como funciona?", text }: HowItWorksProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button className="btn-secondary" type="button" onClick={() => setOpen(true)} aria-label={title}>
        <CircleHelp size={18} aria-hidden />
        {title}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-ink/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="presentation">
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="theme-surface w-full rounded-app border p-4 shadow-lift sm:max-w-md"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink" id={titleId}>{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted" id={descriptionId}>{text}</p>
              </div>
              <IconButton icon={X} label="Fechar explicação" onClick={() => setOpen(false)} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
