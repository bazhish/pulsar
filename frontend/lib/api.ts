import type {
  Bootstrap,
  BudgetSummary,
  Card,
  Category,
  CsvPreview,
  CsvUpload,
  Goal,
  ReportSummary,
  Settings,
  Transaction,
  TransactionType,
  User
} from "@/types/finance";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type RequestOptions = RequestInit & {
  token?: string | null;
};

function withQuery(path: string, params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

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
    const error = await response.json().catch(() => ({ detail: "Falha na requisicao." }));
    throw new Error(error.detail || error.error || "Falha na requisicao.");
  }
  return response.json() as Promise<T>;
}

export type TransactionFilters = {
  month?: string;
  type?: TransactionType | "";
  categoryId?: number | "";
  paymentMethod?: string;
  source?: string;
  cardId?: number | "";
  search?: string;
};

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
  updateProfile(token: string, payload: Partial<Pick<User, "name" | "avatar_url" | "send_monthly_summary">>) {
    return request<User>("/api/auth/me", { method: "PUT", token, body: JSON.stringify(payload) });
  },
  changePassword(token: string, payload: { current_password: string; new_password: string }) {
    return request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", token, body: JSON.stringify(payload) });
  },
  bootstrap(token: string, month: string) {
    return request<Bootstrap>(withQuery("/api/bootstrap", { month }), { token });
  },
  goals(token: string, month: string) {
    return request<Goal>(withQuery("/api/goals", { month }), { token });
  },
  settings(token: string, payload: Partial<{
    monthlyIncome: number;
    dailyGoal: number;
    reserveAmount: number;
    reserveGoalAmount: number;
    reserveCurrentAmount: number;
  }>) {
    return request<Settings>("/api/settings", { method: "POST", token, body: JSON.stringify(payload) });
  },
  cards(token: string, month: string) {
    return request<Card[]>(withQuery("/api/cards", { month }), { token });
  },
  createCard(token: string, payload: {
    name: string;
    brand: string;
    lastFour: string;
    creditLimit: number;
    closingDay: number;
    dueDay: number;
    color: string;
  }) {
    return request<Card>("/api/cards", { method: "POST", token, body: JSON.stringify(payload) });
  },
  updateCard(token: string, cardId: number, payload: Partial<{
    name: string;
    brand: string;
    lastFour: string;
    creditLimit: number;
    closingDay: number;
    dueDay: number;
    color: string;
  }>) {
    return request<Card>(`/api/cards/${cardId}`, { method: "PUT", token, body: JSON.stringify(payload) });
  },
  deleteCard(token: string, cardId: number, force = false) {
    return request<{ deleted: boolean; unlinkedTransactions: number }>(withQuery(`/api/cards/${cardId}`, { force: String(force) }), { method: "DELETE", token });
  },
  createInstallments(token: string, cardId: number, payload: {
    title: string;
    categoryId?: number | null;
    totalAmount: number;
    totalInstallments: number;
    purchaseDate: string;
    notes?: string;
  }) {
    return request<{ createdInstallments: number; group: string; rows: Transaction[] }>(`/api/cards/${cardId}/installments`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  purchaseSimulation(token: string, cardId: number, payload: { totalAmount: number; totalInstallments: number; purchaseDate: string; months?: number }) {
    return request<{ projection: Array<{ month: string; currentInvoice: number; simulatedInstallment: number; projectedTotal: number }> }>(
      `/api/cards/${cardId}/purchase-simulation`,
      { method: "POST", token, body: JSON.stringify(payload) }
    );
  },
  categories(token: string, payload: Pick<Category, "name" | "type" | "color" | "icon">) {
    return request<Category>("/api/categories", { method: "POST", token, body: JSON.stringify(payload) });
  },
  transactions(token: string, filters: TransactionFilters) {
    return request<Transaction[]>(withQuery("/api/transactions", filters), { token });
  },
  transaction(token: string, payload: {
    title: string;
    amount: number;
    type: TransactionType;
    categoryId?: number | null;
    paymentMethod: string;
    transactionDate: string;
    notes?: string;
    cardId?: number | null;
    billingMonth?: string | null;
    isRecurring?: boolean;
    recurrenceType?: "monthly" | "weekly" | null;
    recurrenceDay?: number | null;
  }) {
    return request<Transaction>("/api/transactions", { method: "POST", token, body: JSON.stringify(payload) });
  },
  updateTransaction(token: string, id: number, payload: Partial<{
    title: string;
    amount: number;
    type: TransactionType;
    categoryId: number | null;
    paymentMethod: string;
    transactionDate: string;
    notes: string;
    cardId: number | null;
    billingMonth: string | null;
  }>) {
    return request<Transaction>(`/api/transactions/${id}`, { method: "PUT", token, body: JSON.stringify(payload) });
  },
  deleteTransaction(token: string, id: number) {
    return request<{ deleted?: boolean; deletedGroup?: boolean }>(`/api/transactions/${id}`, { method: "DELETE", token });
  },
  budgets(token: string, month: string) {
    return request<BudgetSummary>(withQuery("/api/budgets", { month }), { token });
  },
  saveBudget(token: string, payload: { categoryId: number; month: string; plannedAmount: number }) {
    return request<{ id: number }>("/api/budgets", { method: "POST", token, body: JSON.stringify(payload) });
  },
  copyBudget(token: string, payload: { fromMonth: string; toMonth: string }) {
    return request<BudgetSummary>("/api/budgets/copy", { method: "POST", token, body: JSON.stringify(payload) });
  },
  reports(token: string, month: string) {
    return request<ReportSummary>(withQuery("/api/reports", { month }), { token });
  },
  uploadCsv(token: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    return request<CsvUpload>("/api/imports/csv/upload", { method: "POST", token, body: form });
  },
  previewCsv(token: string, payload: { importToken: string; mapping: { date: string; description: string; value: string; type?: string | null } }) {
    return request<CsvPreview>("/api/imports/csv/preview", { method: "POST", token, body: JSON.stringify(payload) });
  },
  confirmCsv(token: string, payload: { importToken: string; mapping: { date: string; description: string; value: string; type?: string | null } }) {
    return request<{ imported: number; duplicates: number; invalidRows: number; transactions: Transaction[] }>("/api/imports/csv/confirm", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  rules(token: string) {
    return request<Array<{ id: number; pattern: string; category_id: number; category_name: string }>>("/api/categorization-rules", { token });
  },
  createRule(token: string, payload: { pattern: string; categoryId: number; paymentMethod?: string | null }) {
    return request<{ id: number }>("/api/categorization-rules", { method: "POST", token, body: JSON.stringify(payload) });
  },
  exportCsvUrl(month: string) {
    return `${API_BASE_URL}${withQuery("/api/export/csv", { month })}`;
  },
  exportPdfUrl(month: string) {
    return `${API_BASE_URL}${withQuery("/api/export/pdf", { month })}`;
  }
};
