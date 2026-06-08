"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { useDelayedPresence } from "@/lib/useDelayedPresence";

type HowItWorksProps = {
  title?: string;
  text: string;
};

export function HowItWorks({ title = "Como funciona?", text }: HowItWorksProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { shouldRender, state } = useDelayedPresence(open, 180);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => dialogRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const modal = shouldRender && mounted
    ? createPortal(
        <div
          className={`fixed inset-0 z-[240] flex items-end bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center ${state === "open" ? "animate-overlay-in" : "animate-overlay-out"}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <section
            ref={dialogRef}
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={`theme-surface w-full rounded-app border p-4 shadow-lift outline-none sm:max-w-md ${state === "open" ? "animate-pop-in" : "animate-pop-out"}`}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink" id={titleId}>{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted" id={descriptionId}>{text}</p>
              </div>
              <IconButton icon={X} label="Fechar explicacao" onClick={() => setOpen(false)} />
            </div>
          </section>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button className="btn-secondary" type="button" onClick={() => setOpen(true)} aria-label={title}>
        <CircleHelp size={18} aria-hidden />
        {title}
      </button>
      {modal}
    </>
  );
}
