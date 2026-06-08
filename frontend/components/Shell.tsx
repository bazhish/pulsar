import type { ReactNode } from "react";

export function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
