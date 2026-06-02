"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import type { User } from "@/types/finance";

export default function PerfilPage() {
  const token = useAuthToken();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) return;
    api.me(token).then(setUser).catch(console.error);
  }, [token]);

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <section className="mt-4 rounded border border-black/10 bg-white p-4">
          <span className="text-sm text-black/55">Nome</span>
          <strong className="block">{user?.name || "--"}</strong>
          <span className="mt-4 block text-sm text-black/55">E-mail</span>
          <strong className="block">{user?.email || "--"}</strong>
        </section>
      </div>
    </Shell>
  );
}
