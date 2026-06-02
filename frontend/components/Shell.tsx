"use client";

import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export function Shell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <main className="pb-24 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
