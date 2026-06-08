"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Monitor, Moon, Repeat, Settings, Sun } from "lucide-react";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/authSession";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useAuthToken } from "@/lib/useAuthToken";
import type { User } from "@/types/finance";

const themeOptions: Array<{ value: ThemePreference; label: string; description: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", description: "Interface luminosa para uso diario.", icon: Sun },
  { value: "dark", label: "Escuro", description: "Superficies profundas com contraste reforcado.", icon: Moon },
  { value: "system", label: "Sistema", description: "Segue a preferencia do dispositivo.", icon: Monitor }
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const token = useAuthToken();
  const { effectiveTheme, preference, setPreference } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [sendMonthlySummary, setSendMonthlySummary] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const nextUser = await api.me(token);
    setUser(nextUser);
    setSendMonthlySummary(Boolean(nextUser.send_monthly_summary));
  }, [token]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar configuracoes."));
  }, [load]);

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const nextUser = await api.updateProfile(token, { send_monthly_summary: sendMonthlySummary });
    setUser(nextUser);
    setMessage("Configuracoes salvas.");
  }

  async function endSession() {
    if (token) {
      await api.logout(token).catch(() => undefined);
    }
    clearSession();
    router.replace("/login");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <PageHeader
          description={user?.email || "Preferencias gerais do app"}
          helpText="Ajuste tema, preferencias e sessao. Para dados pessoais, use a aba Perfil."
          icon={Settings}
          title="Configuracoes"
        />

        <FeedbackMessage message={message} />

        <section className="app-card p-4">
          <SectionIntro
            title="Tema"
            description="Escolha uma aparencia confortavel para usar o Pulsa."
            helpText="Sistema acompanha a preferencia do dispositivo e fica salvo neste navegador."
          />
          <div className="grid gap-2 md:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = preference === option.value;
              return (
                <button
                  aria-pressed={active}
                  className={`focus-ring flex items-center gap-3 rounded-app border p-3 text-left transition ${
                    active ? "border-pulse bg-pulse text-white shadow-soft" : "theme-control text-ink hover:border-pulse/50"
                  }`}
                  key={option.value}
                  onClick={() => setPreference(option.value)}
                  type="button"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-app ${active ? "bg-white/20 text-white" : "bg-ink/5 text-ink"}`}>
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{option.label}</strong>
                    <small className={active ? "text-white/85" : "text-muted"}>{option.description}</small>
                  </span>
                  {active ? <Check className="shrink-0" size={18} aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Tema aplicado agora: {effectiveTheme === "dark" ? "escuro" : "claro"}.</p>
        </section>

        <form onSubmit={savePreferences} className="app-card mt-4 p-4">
          <SectionIntro
            title="Preferencias"
            description="Opcoes gerais da sua experiencia no app."
          />
          <label className="flex items-center gap-3 text-sm">
            <input
              className="h-4 w-4"
              type="checkbox"
              checked={sendMonthlySummary}
              onChange={(event) => setSendMonthlySummary(event.target.checked)}
            />
            <span>
              <strong className="block text-ink">Receber resumo mensal</strong>
              <small className="text-muted">Mantem uma lembranca discreta sobre o fechamento do mes.</small>
            </span>
          </label>
          <button className="btn-primary mt-4" type="submit">Salvar preferencias</button>
        </form>

        <section className="app-card mt-4 p-4">
          <SectionIntro
            title="Sessao"
            description="Encerre a sessao atual ou volte para o login para usar outra conta."
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => endSession().catch(() => router.replace("/login"))}>
              <LogOut size={16} aria-hidden />
              Sair
            </button>
            <button className="btn-primary" type="button" onClick={() => endSession().catch(() => router.replace("/login"))}>
              <Repeat size={16} aria-hidden />
              Trocar conta
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
