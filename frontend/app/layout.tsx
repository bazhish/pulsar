import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import { ThemeProvider, ThemeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsa - financas no ritmo certo",
  description: "Controle salario, despesas, metas e parcelas em um so lugar",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg"
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
