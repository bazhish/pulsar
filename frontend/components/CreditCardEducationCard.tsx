import { ShieldCheck } from "lucide-react";

export function CreditCardEducationCard() {
  return (
    <section className="rounded-app border border-pulse/20 bg-gradient-to-r from-mint to-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-white text-pulse shadow-soft">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 className="font-semibold">Controle sua fatura, limite e parcelas futuras.</h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre nome, bandeira, últimos 4 dígitos, limite, fechamento e vencimento. Nunca pedimos número completo nem CVV.
          </p>
          <p className="mt-2 text-xs font-semibold text-ink">Este app não processa pagamentos e não armazena dados sensíveis do cartão.</p>
        </div>
      </div>
    </section>
  );
}
