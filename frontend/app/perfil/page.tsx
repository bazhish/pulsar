"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Settings, UserRound } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, User } from "@/types/finance";

export default function PerfilPage() {
  const token = useAuthToken();
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [message, setMessage] = useState("");
  const month = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    if (!token) return;
    const [nextUser, bootstrap] = await Promise.all([api.me(token), api.bootstrap(token, month)]);
    setUser(nextUser);
    setBoot(bootstrap);
  }, [token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const nextUser = await api.updateProfile(token, {
      name: String(form.get("name")),
      avatar_url: String(form.get("avatar_url") || "") || null,
      send_monthly_summary: Boolean(form.get("send_monthly_summary"))
    });
    setUser(nextUser);
    setMessage("Perfil atualizado.");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.settings(token, {
      monthlyIncome: Number(form.get("monthlyIncome")),
      dailyGoal: Number(form.get("dailyGoal")),
      reserveAmount: Number(form.get("reserveAmount")),
      reserveGoalAmount: Number(form.get("reserveGoalAmount")),
      reserveCurrentAmount: Number(form.get("reserveCurrentAmount"))
    });
    setMessage("Configuracoes salvas.");
    await load();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.changePassword(token, {
      current_password: String(form.get("current_password")),
      new_password: String(form.get("new_password"))
    });
    event.currentTarget.reset();
    setMessage("Senha atualizada.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><UserRound size={24} /> Perfil</h1>
          <p className="text-sm text-muted">{user?.email || ""}</p>
        </header>

        {message ? <p className="mb-4 rounded-app border border-line bg-white p-3 text-sm shadow-soft">{message}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <KpiCard label="Salario" value={formatBRL(boot?.settings.monthly_income || 0)} />
          <KpiCard label="Reserva mensal" value={formatBRL(boot?.settings.reserve_amount || 0)} />
          <KpiCard label="Reserva total" value={formatBRL(boot?.settings.reserve_current_amount || 0)} note={`Meta ${formatBRL(boot?.settings.reserve_goal_amount || 0)}`} />
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={saveProfile} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Settings size={18} /> Dados pessoais</h2>
            <label className="block text-sm">
              Nome
              <input className="field mt-1" name="name" defaultValue={user?.name || ""} required />
            </label>
            <label className="mt-3 block text-sm">
              Avatar URL
              <input className="field mt-1" name="avatar_url" defaultValue={user?.avatar_url || ""} placeholder="https://..." />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input name="send_monthly_summary" type="checkbox" defaultChecked={Boolean(user?.send_monthly_summary)} />
              Resumo mensal
            </label>
            <button className="btn-primary mt-4" type="submit">Salvar perfil</button>
          </form>

          <form onSubmit={saveSettings} className="rounded-app border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 font-semibold">Planejamento financeiro</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" name="monthlyIncome" defaultValue={boot?.settings.monthly_income || 0} placeholder="Salario" inputMode="decimal" />
              <input className="field" name="dailyGoal" defaultValue={boot?.settings.daily_goal || 120} placeholder="Meta diaria" inputMode="decimal" />
              <input className="field" name="reserveAmount" defaultValue={boot?.settings.reserve_amount || 0} placeholder="Reserva mensal" inputMode="decimal" />
              <input className="field" name="reserveGoalAmount" defaultValue={boot?.settings.reserve_goal_amount || 0} placeholder="Meta total de reserva" inputMode="decimal" />
              <input className="field" name="reserveCurrentAmount" defaultValue={boot?.settings.reserve_current_amount || 0} placeholder="Reserva atual" inputMode="decimal" />
            </div>
            <button className="btn-primary mt-4" type="submit">Salvar planejamento</button>
          </form>
        </section>

        <form onSubmit={changePassword} className="mt-4 rounded-app border border-line bg-white p-4 shadow-soft">
          <h2 className="mb-3 font-semibold">Senha</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input className="field" name="current_password" type="password" placeholder="Senha atual" required />
            <input className="field" name="new_password" type="password" placeholder="Nova senha" required />
            <button className="btn-secondary" type="submit">Trocar senha</button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
