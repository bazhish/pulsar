"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, FileUp, PlusCircle } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { OnboardingHint } from "@/components/OnboardingHint";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

export default function OnboardingPage() {
  const token = useAuthToken();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    monthlyIncome: 0,
    reserveAmount: 0,
    reserveGoalAmount: 0,
    dailyGoal: 0
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    await api.settings(token, {
      monthlyIncome: form.monthlyIncome,
      reserveAmount: form.reserveAmount,
      reserveGoalAmount: form.reserveGoalAmount,
      dailyGoal: form.dailyGoal
    });
    setMessage("Primeiro planejamento salvo.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader
          description="Configure os números base para o app calcular seu mês."
          title="Primeiro ritmo"
        />
        <OnboardingHint
          title="Comece simples"
          description="Salário e reserva já bastam para o Resumo funcionar. A meta diária pode ficar vazia ou 0 para o app recomendar."
        />
        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}
        <form onSubmit={save} className="app-card mt-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Salário mensal
              <MoneyInput className="field mt-1" value={form.monthlyIncome} onValueChange={(monthlyIncome) => setForm({ ...form, monthlyIncome })} required />
            </label>
            <label className="text-sm">
              Reserva mensal desejada
              <MoneyInput className="field mt-1" value={form.reserveAmount} onValueChange={(reserveAmount) => setForm({ ...form, reserveAmount })} />
            </label>
            <label className="text-sm">
              Meta total de reserva
              <MoneyInput className="field mt-1" value={form.reserveGoalAmount} onValueChange={(reserveGoalAmount) => setForm({ ...form, reserveGoalAmount })} />
            </label>
            <label className="text-sm">
              Meta diária
              <MoneyInput className="field mt-1" value={form.dailyGoal} onValueChange={(dailyGoal) => setForm({ ...form, dailyGoal })} />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">Meta diária vazia ou 0 usa a recomendação automática.</p>
          <button className="btn-primary mt-4" type="submit">Salvar base <ArrowRight size={16} /></button>
        </form>
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link className="btn-secondary justify-start" href="/transacoes"><PlusCircle size={16} />Criar primeira movimentação</Link>
          <Link className="btn-secondary justify-start" href="/importar"><FileUp size={16} />Importar CSV</Link>
        </section>
        <button className="btn-primary mt-4" type="button" onClick={() => router.replace("/dashboard")}>Ir para o Resumo</button>
      </div>
    </Shell>
  );
}
