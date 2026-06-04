import { BadgeCheck, LineChart, Shield } from "lucide-react";

const benefits = [
  {
    icon: LineChart,
    title: "Ritmo claro",
    text: "Saiba quanto pode gastar hoje sem planilhas complexas."
  },
  {
    icon: Shield,
    title: "Controle total",
    text: "Salário, despesas, metas e parcelas em um só lugar."
  },
  {
    icon: BadgeCheck,
    title: "Decisões rápidas",
    text: "Alertas e metas diárias para manter o mês no trilho."
  }
];

export function AuthBenefits({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <ul className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}>
      {benefits.map((item) => (
        <li key={item.title} className="glass-panel p-3">
          <item.icon size={18} className="text-pulse" />
          <p className="mt-2 text-sm font-bold text-ink">{item.title}</p>
          <p className="mt-1 text-xs text-muted">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}
