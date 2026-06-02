"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthToken() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("rf_token");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setToken(stored);
  }, [router]);

  return token;
}
