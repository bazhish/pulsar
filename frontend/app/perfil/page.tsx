"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Settings, UserRound } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, User } from "@/types/finance";

type PlanningForm = {
  monthlyIncome: string;
  dailyGoal: string;
  reserveAmount: string;
  reserveGoalAmount: string;
  reserveCurrentAmount: string;
};

type ProfileForm = {
  name: string;
  avatarUrl: string;
  sendMonthlySummary: boolean;
};

const emptyPlanning: PlanningForm = {
  monthlyIncome: "0",
  dailyGoal: "0",
  reserveAmount: "0",
  reserveGoalAmount: "0",
  reserveCurrentAmount: "0"
};

function asInput(value: number | undefined | null) {
  return String(value ?? 0);
}

function asNumber(value: string) {
  return Number(value.replace(",", ".") || 0);
}

export default function PerfilPage() {
  const token = useAuthToken();
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [planning, setPlanning] = useState<PlanningForm>(emptyPlanning);
  const [profile, setProfile] = useState<ProfileForm>({ name: "", avatarUrl: "", sendMonthlySummary: false });
  const [message, setMessage] = useState("");
  const month = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    if (!token) return;
    const [nextUser, bootstrap] = await Promise.all([api.me(token), api.bootstrap(token, month)]);
    setUser(nextUser);
    setBoot(bootstrap);
    setProfile({
      name: nextUser.name || "",
      avatarUrl: nextUser.avatar_url || "",
      sendMonthlySummary: Boolean(nextUser.send_monthly_summary)
    });
    setPlanning({
      monthlyIncome: asInput(bootstrap.settings.monthly_income),
      dailyGoal: asInput(bootstrap.settings.daily_goal),
      reserveAmount: asInput(bootstrap.settings.reserve_amount),
      reserveGoalAmount: asInput(bootstrap.settings.reserve_goal_amount),
      reserveCurrentAmount: asInput(bootstrap.settings.reserve_current_amount)
    });
  }, [token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const nextUser = await api.updateProfile(token, {
      name: profile.name,
      avatar_url: profile.avatarUrl || null,
      send_monthly_summary: profile.sendMonthlySummary
    });
    setUser(nextUser);
    setMessage("Perfil atualizado.");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const settings = await api.settings(token, {
      monthlyIncome: asNumber(planning.monthlyIncome),
      dailyGoal: asNumber(planning.dailyGoal),
      reserveAmount: asNumber(planning.reserveAmount),
      reserveGoalAmount: asNumber(planning.reserveGoalAmount),
      reserveCurrentAmount: asNumber(planning.reserveCurrentAmount)
    });
    setBoot((current) => (current ? { ...current, settings } : current));
    setPlanning({
      monthlyIncome: asInput(settings.monthly_income),
      dailyGoal: asInput(settings.daily_goal),
      reserveAmount: asInput(settings.reserve_amount),
      reserveGoalAmount: asInput(settings.reserve_goal_amount),
      reserveCurrentAmount: asInput(settings.reserve_current_amount)
    });
    setMessage("Planejamento salvo.");
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
        <header className="mb-5 rounded-app border border-white/70 bg-gradient-to-br from-white to-mint/70 p-4 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-bold text-pulse"><UserRound size={18} /> Perfil</p>
          <h1 className="mt-1 text-2xl font-black">Ajustes da sua conta</h1>
          <p className="text-sm text-muted">{user?.email || ""}</p>
        </header>

        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <KpiCard label="Salario" value={formatBRL(boot?.settings.monthly_income || 0)} />
          <KpiCard label="Meta diaria" value={formatBRL(boot?.settings.daily_goal || 0)} note={(boot?.settings.daily_goal || 0) > 0 ? "Manual" : "Automatica"} />
          <KpiCard label="Reserva total" value={formatBRL(boot?.settings.reserve_current_amount || 0)} note={`Meta ${formatBRL(boot?.settings.reserve_goal_amount || 0)}`} />
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={saveProfile} className="app-card p-4">
            <SectionIntro
              title="Dados pessoais"
              description="Informacoes basicas usadas para personalizar o Resumo."
              action={<Settings size={18} className="text-pulse" />}
            />
            <label className="block text-sm">
              Nome
              <input className="field mt-1" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
            </label>
            <label className="mt-3 block text-sm">
              Avatar URL
              <input className="field mt-1" value={profile.avatarUrl} onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })} placeholder="https://..." />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.sendMonthlySummary} onChange={(event) => setProfile({ ...profile, sendMonthlySummary: event.target.checked })} />
              Resumo mensal
            </label>
            <button className="btn-primary mt-4" type="submit">Salvar perfil</button>
          </form>

          <form onSubmit={saveSettings} className="app-card p-4">
            <SectionIntro
              title="Planejamento financeiro"
              description="Valores usados nos calculos de ritmo, metas e saldo previsto."
              helpText="Meta diaria em 0 deixa o app recomendar automaticamente."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Salario base
                <input className="field mt-1" value={planning.monthlyIncome} onChange={(event) => setPlanning({ ...planning, monthlyIncome: event.target.value })} inputMode="decimal" />
              </label>
              <label className="text-sm">
                Meta diaria
                <input className="field mt-1" value={planning.dailyGoal} onChange={(event) => setPlanning({ ...planning, dailyGoal: event.target.value })} inputMode="decimal" />
              </label>
              <label className="text-sm">
                Reserva mensal
                <input className="field mt-1" value={planning.reserveAmount} onChange={(event) => setPlanning({ ...planning, reserveAmount: event.target.value })} inputMode="decimal" />
              </label>
              <label className="text-sm">
                Meta total de reserva
                <input className="field mt-1" value={planning.reserveGoalAmount} onChange={(event) => setPlanning({ ...planning, reserveGoalAmount: event.target.value })} inputMode="decimal" />
              </label>
              <label className="text-sm">
                Reserva atual
                <input className="field mt-1" value={planning.reserveCurrentAmount} onChange={(event) => setPlanning({ ...planning, reserveCurrentAmount: event.target.value })} inputMode="decimal" />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted">Meta diaria em 0 usa a recomendacao automatica.</p>
            <button className="btn-primary mt-4" type="submit">Salvar planejamento</button>
          </form>
        </section>

        <form onSubmit={changePassword} className="app-card mt-4 p-4">
          <SectionIntro
            title="Senha"
            description="Atualize sua senha quando precisar reforcar a seguranca."
          />
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
