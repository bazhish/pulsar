"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, FileUp, PlusCircle } from "lucide-react";
import { OnboardingHint } from "@/components/OnboardingHint";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

function asNumber(value: string) {
  return Number(value.replace(",", ".") || 0);
}

export default function OnboardingPage() {
  const token = useAuthToken();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    monthlyIncome: "",
    reserveAmount: "",
    reserveGoalAmount: "",
    dailyGoal: ""
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    await api.settings(token, {
      monthlyIncome: asNumber(form.monthlyIncome),
      reserveAmount: asNumber(form.reserveAmount),
      reserveGoalAmount: asNumber(form.reserveGoalAmount),
      dailyGoal: asNumber(form.dailyGoal)
    });
    setMessage("Primeiro planejamento salvo.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold">Primeiro ritmo</h1>
          <p className="text-sm text-muted">Configure os numeros base para o app calcular seu mes.</p>
        </header>
        <OnboardingHint
          title="Comece simples"
          description="Salario e reserva ja bastam para o Resumo funcionar. A meta diaria pode ficar vazia ou 0 para o app recomendar."
        />
        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}
        <form onSubmit={save} className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Salario mensal
              <input className="field mt-1" value={form.monthlyIncome} onChange={(event) => setForm({ ...form, monthlyIncome: event.target.value })} inputMode="decimal" required />
            </label>
            <label className="text-sm">
              Reserva mensal desejada
              <input className="field mt-1" value={form.reserveAmount} onChange={(event) => setForm({ ...form, reserveAmount: event.target.value })} inputMode="decimal" />
            </label>
            <label className="text-sm">
              Meta total de reserva
              <input className="field mt-1" value={form.reserveGoalAmount} onChange={(event) => setForm({ ...form, reserveGoalAmount: event.target.value })} inputMode="decimal" />
            </label>
            <label className="text-sm">
              Meta diaria
              <input className="field mt-1" value={form.dailyGoal} onChange={(event) => setForm({ ...form, dailyGoal: event.target.value })} inputMode="decimal" />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">Meta diaria vazia ou 0 usa a recomendacao automatica.</p>
          <button className="btn-primary mt-4" type="submit">Salvar base <ArrowRight size={16} /></button>
        </form>
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link className="btn-secondary justify-start" href="/transacoes"><PlusCircle size={16} />Criar primeira movimentacao</Link>
          <Link className="btn-secondary justify-start" href="/importar"><FileUp size={16} />Importar CSV</Link>
        </section>
        <button className="btn-primary mt-4" type="button" onClick={() => router.replace("/dashboard")}>Ir para o Resumo</button>
      </div>
    </Shell>
  );
}
