"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, FileUp, PlusCircle } from "lucide-react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

export default function OnboardingPage() {
  const token = useAuthToken();
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.settings(token, {
      monthlyIncome: Number(form.get("monthlyIncome")),
      reserveAmount: Number(form.get("reserveAmount")),
      reserveGoalAmount: Number(form.get("reserveGoalAmount")),
      dailyGoal: Number(form.get("dailyGoal"))
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
        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}
        <form onSubmit={save} className="rounded-app border border-line bg-white p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="monthlyIncome" placeholder="Salario mensal" inputMode="decimal" required />
            <input className="field" name="reserveAmount" placeholder="Reserva mensal desejada" inputMode="decimal" defaultValue="0" />
            <input className="field" name="reserveGoalAmount" placeholder="Meta total de reserva" inputMode="decimal" defaultValue="0" />
            <input className="field" name="dailyGoal" placeholder="Meta diaria" inputMode="decimal" defaultValue="120" />
          </div>
          <button className="btn-primary mt-4" type="submit">Salvar base <ArrowRight size={16} /></button>
        </form>
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link className="btn-secondary justify-start" href="/transacoes"><PlusCircle size={16} />Criar primeiro lancamento</Link>
          <Link className="btn-secondary justify-start" href="/importar"><FileUp size={16} />Importar CSV</Link>
        </section>
        <button className="btn-primary mt-4" type="button" onClick={() => router.replace("/dashboard")}>Ir para dashboard</button>
      </div>
    </Shell>
  );
}
