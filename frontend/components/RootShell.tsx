"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";

const appRoutes = [
  "/configuracoes",
  "/dashboard",
  "/importar",
  "/metas",
  "/onboarding",
  "/orcamento",
  "/parcelas",
  "/perfil",
  "/relatorios",
  "/transacoes"
];

export function RootShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const shouldUseShell = appRoutes.some((route) => pathname.startsWith(route));

  if (!shouldUseShell) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
