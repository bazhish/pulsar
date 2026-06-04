"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Mail, Monitor, Moon, Sun, Trash2, Upload, UserRound, WalletCards } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api, apiAssetUrl } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Bootstrap, User } from "@/types/finance";

type ProfileForm = {
  name: string;
  sendMonthlySummary: boolean;
};

const PHOTO_MAX_BYTES = 512 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function initialsFromUser(user: User | null) {
  const source = user?.name || user?.email || "Usuário";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function ProfilePhoto({
  initials,
  name,
  preview
}: {
  initials: string;
  name: string;
  preview: string;
}) {
  if (preview) {
    return (
      <span
        aria-label={`Foto de perfil de ${name}`}
        className="block h-24 w-24 rounded-app bg-cover bg-center shadow-soft ring-1 ring-line"
        role="img"
        style={{ backgroundImage: `url(${preview})` }}
      />
    );
  }

  return (
    <span className="flex h-24 w-24 items-center justify-center rounded-app bg-gradient-to-br from-pulse to-plum text-2xl font-black text-white shadow-soft" aria-hidden>
      {initials}
    </span>
  );
}

const themeOptions: Array<{ value: ThemePreference; label: string; description: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", description: "Interface limpa e luminosa.", icon: Sun },
  { value: "dark", label: "Escuro", description: "Superfícies profundas com bom contraste.", icon: Moon },
  { value: "system", label: "Sistema", description: "Segue a preferência do dispositivo.", icon: Monitor }
];

export default function PerfilPage() {
  const token = useAuthToken();
  const { effectiveTheme, preference, setPreference } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({ name: "", sendMonthlySummary: false });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const month = new Date().toISOString().slice(0, 7);

  const clearObjectPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    const [nextUser, bootstrap] = await Promise.all([api.me(token), api.bootstrap(token, month)]);
    clearObjectPreview();
    setUser(nextUser);
    setBoot(bootstrap);
    setPhotoFile(null);
    setPhotoPreview(apiAssetUrl(nextUser.avatar_url));
    setProfile({
      name: nextUser.name || "",
      sendMonthlySummary: Boolean(nextUser.send_monthly_summary)
    });
  }, [clearObjectPreview, token, month]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar."));
  }, [load]);

  useEffect(() => () => clearObjectPreview(), [clearObjectPreview]);

  function updateSidebarUser() {
    window.dispatchEvent(new Event("pulsar:user-updated"));
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setMessage("Envie uma foto JPG, PNG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > PHOTO_MAX_BYTES) {
      setMessage("A foto deve ter no máximo 512 KB.");
      event.target.value = "";
      return;
    }

    clearObjectPreview();
    const nextPreview = URL.createObjectURL(file);
    objectUrlRef.current = nextPreview;
    setPhotoFile(file);
    setPhotoPreview(nextPreview);
    setMessage("Foto selecionada. Salve o perfil para aplicar.");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      let nextUser = await api.updateProfile(token, {
        name: profile.name,
        send_monthly_summary: profile.sendMonthlySummary
      });
      if (photoFile) {
        nextUser = await api.uploadProfilePhoto(token, photoFile);
      }

      clearObjectPreview();
      setPhotoFile(null);
      setPhotoPreview(apiAssetUrl(nextUser.avatar_url));
      setUser(nextUser);
      updateSidebarUser();
      setMessage("Perfil atualizado.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function removePhoto() {
    if (!token) return;
    setSavingProfile(true);
    try {
      const nextUser = await api.updateProfile(token, { avatar_url: null });
      clearObjectPreview();
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPhotoFile(null);
      setPhotoPreview("");
      setUser(nextUser);
      updateSidebarUser();
      setMessage("Foto removida.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao remover foto.");
    } finally {
      setSavingProfile(false);
    }
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

  const initials = initialsFromUser(user);
  const displayName = user?.name || profile.name || "Perfil";

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <PageHeader
          description={user?.email || ""}
          icon={UserRound}
          title="Ajustes da sua conta"
        />

        {message ? <p className="app-card mb-4 p-3 text-sm" role="status">{message}</p> : null}

        <section className="app-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProfilePhoto initials={initials} name={displayName} preview={photoPreview} />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-muted">Conta Pulsar</p>
                <h2 className="truncate text-xl font-black text-ink">{displayName}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <Mail size={15} aria-hidden />
                  <span className="truncate">{user?.email}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <Camera size={16} aria-hidden />
                Escolher foto
              </button>
              {photoPreview ? (
                <button className="btn-secondary" type="button" onClick={removePhoto} disabled={savingProfile}>
                  <Trash2 size={16} aria-hidden />
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={saveProfile} className="app-card p-4">
            <SectionIntro
              title="Dados pessoais"
              description="Nome, foto e preferências usadas para personalizar sua experiência."
              action={<Upload size={18} className="text-pulse" />}
            />
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept={PHOTO_TYPES.join(",")}
              onChange={selectPhoto}
            />
            <label className="block text-sm font-semibold">
              Nome
              <input className="field mt-1" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
            </label>
            <div className="mt-3 rounded-app border border-line p-3">
              <p className="text-sm font-semibold text-ink">Foto de perfil</p>
              <p className="mt-1 text-xs text-muted">JPG, PNG ou WebP até 512 KB. A foto aparece no Perfil e na sidebar.</p>
              <button className="btn-secondary mt-3" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} aria-hidden />
                Selecionar imagem
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.sendMonthlySummary} onChange={(event) => setProfile({ ...profile, sendMonthlySummary: event.target.checked })} />
              Receber resumo mensal
            </label>
            <button className="btn-primary mt-4" type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>

          <section className="app-card p-4">
            <SectionIntro
              title="Tema"
              description="Escolha uma aparência confortável para usar o Pulsar no seu ritmo."
              helpText="Sistema acompanha a preferência do dispositivo e também fica salva neste navegador."
            />
            <div className="grid gap-2">
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
                    <span className="min-w-0">
                      <strong className="block">{option.label}</strong>
                      <small className={active ? "text-white/80" : "text-muted"}>{option.description}</small>
                    </span>
                    {active ? <Check className="ml-auto shrink-0" size={18} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">Tema aplicado agora: {effectiveTheme === "dark" ? "escuro" : "claro"}.</p>
          </section>
        </section>

        <section className="app-card mt-4 p-4">
          <SectionIntro
            title="Dados financeiros"
            description="Confira os números base usados no Resumo e ajuste o planejamento em uma tela dedicada."
            action={<WalletCards size={18} className="text-pulse" />}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <KpiCard label="Salário" value={formatBRL(boot?.settings.monthly_income || 0)} />
            <KpiCard label="Meta diária" value={formatBRL(boot?.settings.daily_goal || 0)} note={(boot?.settings.daily_goal || 0) > 0 ? "Manual" : "Automática"} />
            <KpiCard label="Reserva total" value={formatBRL(boot?.settings.reserve_current_amount || 0)} note={`Meta ${formatBRL(boot?.settings.reserve_goal_amount || 0)}`} />
          </div>
          <Link className="btn-secondary mt-4" href="/onboarding">
            <WalletCards size={16} aria-hidden />
            Editar planejamento financeiro
          </Link>
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
