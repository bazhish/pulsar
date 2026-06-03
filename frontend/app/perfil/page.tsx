"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Settings, UserRound } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, User } from "@/types/finance";

type PlanningForm = {
  monthlyIncome: number;
  dailyGoal: number;
  reserveAmount: number;
  reserveGoalAmount: number;
  reserveCurrentAmount: number;
};

type ProfileForm = {
  name: string;
  avatarUrl: string;
  sendMonthlySummary: boolean;
};

const emptyPlanning: PlanningForm = {
  monthlyIncome: 0,
  dailyGoal: 0,
  reserveAmount: 0,
  reserveGoalAmount: 0,
  reserveCurrentAmount: 0
};

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
      monthlyIncome: bootstrap.settings.monthly_income ?? 0,
      dailyGoal: bootstrap.settings.daily_goal ?? 0,
      reserveAmount: bootstrap.settings.reserve_amount ?? 0,
      reserveGoalAmount: bootstrap.settings.reserve_goal_amount ?? 0,
      reserveCurrentAmount: bootstrap.settings.reserve_current_amount ?? 0
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
      monthlyIncome: planning.monthlyIncome,
      dailyGoal: planning.dailyGoal,
      reserveAmount: planning.reserveAmount,
      reserveGoalAmount: planning.reserveGoalAmount,
      reserveCurrentAmount: planning.reserveCurrentAmount
    });
    setBoot((current) => (current ? { ...current, settings } : current));
    setPlanning({
      monthlyIncome: settings.monthly_income ?? 0,
      dailyGoal: settings.daily_goal ?? 0,
      reserveAmount: settings.reserve_amount ?? 0,
      reserveGoalAmount: settings.reserve_goal_amount ?? 0,
      reserveCurrentAmount: settings.reserve_current_amount ?? 0
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
        <PageHeader
          description={user?.email || ""}
          icon={UserRound}
          title="Ajustes da sua conta"
        />

        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <KpiCard label="Salário" value={formatBRL(boot?.settings.monthly_income || 0)} />
          <KpiCard label="Meta diária" value={formatBRL(boot?.settings.daily_goal || 0)} note={(boot?.settings.daily_goal || 0) > 0 ? "Manual" : "Automática"} />
          <KpiCard label="Reserva total" value={formatBRL(boot?.settings.reserve_current_amount || 0)} note={`Meta ${formatBRL(boot?.settings.reserve_goal_amount || 0)}`} />
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <form onSubmit={saveProfile} className="app-card p-4">
            <SectionIntro
              title="Dados pessoais"
              description="Informações básicas usadas para personalizar o Resumo."
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
              description="Valores usados nos cálculos de ritmo, metas e saldo previsto."
              helpText="Meta diária em 0 deixa o app recomendar automaticamente."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Salário base
                <MoneyInput className="field mt-1" value={planning.monthlyIncome} onValueChange={(monthlyIncome) => setPlanning({ ...planning, monthlyIncome })} />
              </label>
              <label className="text-sm">
                Meta diária
                <MoneyInput className="field mt-1" value={planning.dailyGoal} onValueChange={(dailyGoal) => setPlanning({ ...planning, dailyGoal })} />
              </label>
              <label className="text-sm">
                Reserva mensal
                <MoneyInput className="field mt-1" value={planning.reserveAmount} onValueChange={(reserveAmount) => setPlanning({ ...planning, reserveAmount })} />
              </label>
              <label className="text-sm">
                Meta total de reserva
                <MoneyInput className="field mt-1" value={planning.reserveGoalAmount} onValueChange={(reserveGoalAmount) => setPlanning({ ...planning, reserveGoalAmount })} />
              </label>
              <label className="text-sm">
                Reserva atual
                <MoneyInput className="field mt-1" value={planning.reserveCurrentAmount} onValueChange={(reserveCurrentAmount) => setPlanning({ ...planning, reserveCurrentAmount })} />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted">Meta diária em 0 usa a recomendação automática.</p>
            <button className="btn-primary mt-4" type="submit">Salvar planejamento</button>
          </form>
        </section>

        <form onSubmit={changePassword} className="app-card mt-4 p-4">
          <SectionIntro
            title="Senha"
            description="Atualize sua senha quando precisar reforçar a segurança."
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
