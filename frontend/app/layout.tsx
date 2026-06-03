import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ritmo Financeiro Pro",
  description: "Controle financeiro pessoal",
  icons: {
    icon: "/logo-mark.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
