"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDelayedPresence } from "@/lib/useDelayedPresence";

type FirstTimeExplainerProps = {
  storageKey: string;
  title: string;
  description: string;
};

export function FirstTimeExplainer({ storageKey, title, description }: FirstTimeExplainerProps) {
  const [visible, setVisible] = useState(false);
  const { shouldRender, state } = useDelayedPresence(visible, 180);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  function close() {
    window.localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!shouldRender) return null;

  return (
    <section className={`mb-4 rounded-app border border-pulse/20 bg-gradient-to-r from-mint/80 to-surface p-4 shadow-soft ${state === "open" ? "animate-pop-in" : "animate-pop-out"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button className="focus-ring theme-control h-8 w-8 rounded-app border text-muted" type="button" onClick={close} aria-label="Fechar">
          <X className="mx-auto" size={15} />
        </button>
      </div>
    </section>
  );
}
