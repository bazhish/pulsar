import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsar — finanças no ritmo certo",
  description: "Controle salário, despesas, metas e parcelas em um só lugar",
  icons: {
    icon: "/logo-mark.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <ThemeProvider>
          <RootShell>{children}</RootShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
