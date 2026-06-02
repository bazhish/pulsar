"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-app border border-line bg-white p-5 shadow-lift">
        <Image src="/logo.svg" width={220} height={62} alt="Ritmo Financeiro Pro" priority />
        <h1 className="mt-5 text-xl font-bold">Entrar</h1>
        <label className="mt-4 block text-sm">
          E-mail
          <input className="field mt-1" name="email" type="email" required />
        </label>
        <label className="mt-3 block text-sm">
          Senha
          <input className="field mt-1" name="password" type="password" required />
        </label>
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
        <button className="btn-primary mt-4 w-full" type="submit">
          Entrar
        </button>
        <Link className="mt-3 block text-center text-sm font-semibold text-sky" href="/cadastro">Criar conta</Link>
      </form>
    </main>
  );
}
