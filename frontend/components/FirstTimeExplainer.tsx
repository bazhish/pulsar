"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type FirstTimeExplainerProps = {
  storageKey: string;
  title: string;
  description: string;
};

export function FirstTimeExplainer({ storageKey, title, description }: FirstTimeExplainerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  function close() {
    window.localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="mb-4 rounded-app border border-sky/20 bg-sky/5 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button className="focus-ring h-8 w-8 rounded-app border border-line bg-white text-muted" type="button" onClick={close} aria-label="Fechar">
          <X className="mx-auto" size={15} />
        </button>
      </div>
    </section>
  );
}
