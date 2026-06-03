"use client";

import type { ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  side?: "top" | "right";
};

const sideClass = {
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2"
};

export function Tooltip({ children, disabled = false, label, side = "top" }: TooltipProps) {
  if (disabled) return <>{children}</>;

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-line bg-ink px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lift transition duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${sideClass[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
