"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.login(String(form.get("email")), String(form.get("password")));
      window.sessionStorage.setItem("rf_token", response.access_token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    }
  }

  return (
    <main className="grid min-h-screen px-4 py-6 lg:grid-cols-[1fr_0.9fr] lg:gap-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <Image src="/logo.svg" width={230} height={65} alt="Ritmo Financeiro Pro" priority />
        <form onSubmit={handleSubmit} className="app-card mt-6 p-5">
          <p className="text-sm font-bold text-pulse">Bem-vindo de volta</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">Entre para ver seu ritmo financeiro.</h1>
          <label className="mt-5 block text-sm font-semibold">
            E-mail
            <input className="field mt-1" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Senha
            <input className="field mt-1" name="password" type="password" autoComplete="current-password" required />
          </label>
          {error ? <p className="mt-3 rounded-app bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
          <button className="btn-primary mt-5 w-full" type="submit">
            Entrar
            <ArrowRight size={16} />
          </button>
          <Link className="mt-4 block text-center text-sm font-bold text-plum" href="/cadastro">Criar conta</Link>
        </form>
      </section>

      <section className="mt-6 hidden overflow-hidden rounded-app border border-white/70 bg-gradient-to-br from-night via-ink to-plum p-8 text-white shadow-lift lg:flex lg:flex-col lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-app bg-white/10 px-3 py-2 text-sm font-semibold">
            <TrendingUp size={16} />
            Ritmo do mes
          </span>
          <h2 className="mt-6 max-w-md text-4xl font-black leading-tight">Organizacao financeira pessoal com leitura rapida.</h2>
          <p className="mt-3 max-w-md text-sm text-white/70">Resumo, metas, orcamento e cartoes em uma experiencia limpa, jovem e confiavel.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Resumo", "Metas", "Cartoes"].map((item) => (
            <div key={item} className="rounded-app border border-white/10 bg-white/10 p-4 backdrop-blur">
              <ShieldCheck className="text-pulse" size={20} />
              <strong className="mt-3 block">{item}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
