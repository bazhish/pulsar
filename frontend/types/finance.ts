export type TransactionType = "income" | "expense";
export type DataSource = "manual" | "csv_import" | "open_finance_future";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  send_monthly_summary: boolean;
  is_active: boolean;
};

export type Category = {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
};

export type Transaction = {
  id: number;
  title: string;
  amount: number;
  type: TransactionType;
  category_id?: number | null;
  category_name?: string | null;
  payment_method: string;
  transaction_date: string;
  card_id?: number | null;
  card_name?: string | null;
  billing_month?: string | null;
  source: DataSource;
};

export type Card = {
  id: number;
  name: string;
  brand: string;
  last_four: string;
  credit_limit: number;
  invoice: number;
  availableCredit?: number;
  committedLimit?: number;
  remainingInstallments?: number;
  activeInstallments?: Array<{
    title: string;
    amount: number;
    remaining: number;
    installmentLabel?: string;
  }>;
};

export type Dashboard = {
  month: string;
  monthlyIncome: number;
  inflow: number;
  outflow: number;
  balance: number;
  categoryBreakdown: Array<{ name: string; color: string; total: number }>;
  monthlyTrend: Array<{ month: string; label: string; inflow: number; outflow: number; net: number }>;
  recentTransactions: Transaction[];
};

export type GoalDay = {
  day: number;
  spent: number;
  remaining: number;
  progress: number;
  status: "ok" | "over" | "empty";
};

export type Goal = {
  month: string;
  dailyGoal: number;
  reserveAmount: number;
  availableBudget: number;
  recommendedDailyGoal: number;
  targetDailyGoal: number;
  allowedRemaining: number;
  daysAboveGoal: number;
  daysBelowGoal: number;
  projectedClosing: number;
  currentAverageSpend: number;
  goalStatus: "green" | "yellow" | "red";
  riskAlert: string;
  days: GoalDay[];
};

export type Bootstrap = {
  settings: Record<string, unknown>;
  categories: Category[];
  cards: Card[];
  transactions: Transaction[];
  dashboard: Dashboard;
  score: { score: number; label: string; color: string };
  alerts: Array<{ type: string; category: string; message: string }>;
  user: User;
};
