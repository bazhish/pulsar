"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearSession, COOKIE_AUTH_TOKEN, hasSessionHint, rememberSession } from "@/lib/authSession";

export function useAuthToken() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function validateSession() {
      try {
        await api.me(COOKIE_AUTH_TOKEN);
        if (!active) return;
        rememberSession();
        setToken(COOKIE_AUTH_TOKEN);
      } catch {
        if (!active) return;
        clearSession();
        router.replace("/login");
      }
    }

    if (hasSessionHint()) {
      validateSession();
      return () => {
        active = false;
      };
    }

    validateSession();
    return () => {
      active = false;
    };
  }, [router]);

  return token;
}
