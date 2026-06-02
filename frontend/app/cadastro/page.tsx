"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export default function CadastroPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password"))
      });
      window.sessionStorage.setItem("rf_token", response.access_token);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    }
  }

  return (
    <main className="grid min-h-screen px-4 py-6 lg:grid-cols-[0.9fr_1fr] lg:gap-8 lg:px-10">
      <section className="hidden overflow-hidden rounded-app border border-white/70 bg-gradient-to-br from-mint via-white to-sky/10 p-8 shadow-lift lg:flex lg:flex-col lg:justify-between">
        <Image src="/logo.svg" width={230} height={65} alt="Ritmo Financeiro Pro" priority />
        <div>
          <span className="inline-flex items-center gap-2 rounded-app bg-pulse/10 px-3 py-2 text-sm font-bold text-pulse">
            <Sparkles size={16} />
            Comece leve
          </span>
          <h2 className="mt-6 max-w-md text-4xl font-black leading-tight text-ink">Seu dinheiro com metas claras e menos ruido.</h2>
          <p className="mt-3 max-w-md text-sm text-muted">Configure salario, reserva e acompanhe o ritmo do mes sem uma tela cheia de termos bancarios.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Resumo limpo", "Metas visuais", "Orcamento simples"].map((item) => (
            <div key={item} className="rounded-app border border-white/80 bg-white/75 p-4 shadow-soft">
              <BadgeCheck className="text-pulse" size={20} />
              <strong className="mt-3 block text-sm">{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <Image className="lg:hidden" src="/logo.svg" width={230} height={65} alt="Ritmo Financeiro Pro" priority />
        <form onSubmit={handleSubmit} className="app-card mt-6 p-5">
          <p className="text-sm font-bold text-pulse">Criar conta</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">Monte seu primeiro resumo financeiro.</h1>
          <label className="mt-5 block text-sm font-semibold">
            Nome
            <input className="field mt-1" name="name" autoComplete="name" required />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            E-mail
            <input className="field mt-1" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Senha
            <input className="field mt-1" name="password" type="password" autoComplete="new-password" required />
          </label>
          {error ? <p className="mt-3 rounded-app bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
          <button className="btn-primary mt-5 w-full" type="submit">
            Criar conta
            <ArrowRight size={16} />
          </button>
          <Link className="mt-4 block text-center text-sm font-bold text-plum" href="/login">Ja tenho conta</Link>
        </form>
      </section>
    </main>
  );
}
