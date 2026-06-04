"use client";

import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  label: string;
  showTooltip?: boolean;
};

export function IconButton({ className = "", icon: Icon, label, showTooltip = true, type = "button", ...props }: IconButtonProps) {
  const button = (
    <button
      {...props}
      aria-label={label}
      className={`focus-ring theme-control inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-app border text-ink shadow-sm transition hover:border-pulse/50 ${className}`}
      type={type}
    >
      <Icon size={18} aria-hidden />
    </button>
  );

  return (
    <Tooltip disabled={!showTooltip} label={label}>
      {button}
    </Tooltip>
  );
}
