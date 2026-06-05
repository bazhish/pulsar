"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { AuthBenefits } from "@/components/auth/AuthBenefits";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthProductDemo } from "@/components/auth/AuthProductDemo";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export default function CadastroPage() {
  const router = useRouter();
  const { effectiveTheme, preference, setPreference } = useTheme();
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("password_confirm"));
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    try {
      const response = await api.register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password
      });
      window.sessionStorage.setItem("rf_token", response.access_token);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    }
  }

  function toggleTheme() {
    setPreference(effectiveTheme === "dark" ? "light" : "dark");
  }

  return (
    <main className="auth-glow relative min-h-screen px-4 py-6 lg:px-10 lg:py-10">
      <button
        type="button"
        className="btn-secondary absolute right-4 top-4 z-10 px-3 py-2 lg:right-10"
        onClick={toggleTheme}
        aria-label="Alternar tema"
      >
        {preference === "system" ? (
          effectiveTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />
        ) : effectiveTheme === "dark" ? (
          <Moon size={16} />
        ) : (
          <Sun size={16} />
        )}
      </button>

      <div className="glass-panel mx-auto grid w-full max-w-6xl overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
        <section className="order-1 mx-auto w-full max-w-md p-5 lg:order-1 lg:p-7">
          <form onSubmit={handleSubmit}>
            <p className="text-sm font-bold text-pulse">Comece no Pulsar</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-ink">Monte seu ritmo financeiro</h1>
            <p className="mt-2 text-sm text-muted">Crie sua conta e organize salário, metas e parcelas com clareza.</p>

            <label className="mt-5 block text-sm font-semibold text-ink">
              Nome
              <input className="field mt-1" name="name" autoComplete="name" required />
            </label>
            <label className="mt-3 block text-sm font-semibold text-ink">
              E-mail
              <input className="field mt-1" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="mt-3 block text-sm font-semibold text-ink">
              Senha
              <input className="field mt-1" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="mt-3 block text-sm font-semibold text-ink">
              Confirmar senha
              <input
                className="field mt-1"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            {error ? <p className="mt-3 rounded-app bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

            <button className="btn-primary mt-5 w-full" type="submit">
              Criar conta
              <ArrowRight size={16} />
            </button>

            <SocialLoginButtons mode="register" />

            <Link className="mt-4 block text-center text-sm font-bold text-plum" href="/login">
              Já tenho conta — entrar
            </Link>
          </form>

        </section>

        <section className="order-2 border-t border-line/70 p-5 lg:order-2 lg:border-l lg:border-t-0 lg:p-7">
          <AuthBrand />
          <p className="mt-5 max-w-xl text-sm text-muted">
            Controle salário, despesas, metas e parcelas em um só lugar. Comece com uma visão prática do app.
          </p>
          <div className="mt-6 hidden lg:block">
            <AuthProductDemo />
          </div>
          <div className="mt-4 lg:hidden">
            <AuthProductDemo compact />
          </div>
          <div className="mt-5">
            <AuthBenefits compact />
          </div>
        </section>
      </div>
    </main>
  );
}
