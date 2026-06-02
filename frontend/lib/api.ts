import type { Bootstrap, Card, Category, Goal, Transaction, User } from "@/types/finance";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Falha na requisição." }));
    throw new Error(error.detail || error.error || "Falha na requisição.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  register(payload: { name: string; email: string; password: string }) {
    return request<{ access_token: string; token_type: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(email: string, password: string) {
    const body = new URLSearchParams({ email, password });
    return request<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  },
  me(token: string) {
    return request<User>("/api/auth/me", { token });
  },
  bootstrap(token: string, month: string) {
    return request<Bootstrap>(`/api/bootstrap?month=${encodeURIComponent(month)}`, { token });
  },
  goals(token: string, month: string) {
    return request<Goal>(`/api/goals?month=${encodeURIComponent(month)}`, { token });
  },
  cards(token: string, month: string) {
    return request<Card[]>(`/api/cards?month=${encodeURIComponent(month)}`, { token });
  },
  categories(token: string, payload: Pick<Category, "name" | "type" | "color" | "icon">) {
    return request<Category>("/api/categories", { method: "POST", token, body: JSON.stringify(payload) });
  },
  transaction(token: string, payload: Partial<Transaction> & { amount: number; transactionDate: string }) {
    return request<Transaction>("/api/transactions", { method: "POST", token, body: JSON.stringify(payload) });
  }
};
