"use client";

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
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded border border-black/10 bg-white p-5">
        <h1 className="text-xl font-bold">Entrar</h1>
        <label className="mt-4 block text-sm">
          E-mail
          <input className="focus-ring mt-1 w-full rounded border border-black/10 px-3 py-2" name="email" type="email" required />
        </label>
        <label className="mt-3 block text-sm">
          Senha
          <input className="focus-ring mt-1 w-full rounded border border-black/10 px-3 py-2" name="password" type="password" required />
        </label>
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
        <button className="focus-ring mt-4 w-full rounded bg-ink px-4 py-2 font-semibold text-white" type="submit">
          Entrar
        </button>
        <Link className="mt-3 block text-center text-sm text-sky" href="/cadastro">Criar conta</Link>
      </form>
    </main>
  );
}
