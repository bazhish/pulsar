"use client";

import { AppShell, useInsideAppShell } from "@/components/AppShell";

export function Shell({ children }: Readonly<{ children: React.ReactNode }>) {
  const insideAppShell = useInsideAppShell();
  if (insideAppShell) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
