import { ShieldCheck } from "lucide-react";

export function CreditCardEducationCard() {
  return (
    <section className="rounded-app border border-sky/20 bg-sky/5 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-white text-sky">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 className="font-semibold">Controle sua fatura, limite e parcelas futuras.</h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre nome, bandeira, ultimos 4 digitos, limite, fechamento e vencimento. Nunca pedimos numero completo nem CVV.
          </p>
          <p className="mt-2 text-xs font-semibold text-ink">Este app nao processa pagamentos e nao armazena dados sensiveis do cartao.</p>
        </div>
      </div>
    </section>
  );
}
