import { formatBRL } from "@/lib/format";
import type { GoalDay } from "@/types/finance";

type DailyGoalCircleProps = {
  day: GoalDay;
  active?: boolean;
  onSelect?: () => void;
};

function tone(day: GoalDay) {
  if (day.status === "empty") return { color: "#E5E7EB", label: "Sem gasto", className: "text-muted" };
  if (day.status === "over") return { color: "#DC4C3F", label: "Acima", className: "text-coral" };
  if (day.progress >= 80) return { color: "#F4C430", label: "Atencao", className: "text-ink" };
  return { color: "#16A34A", label: "Dentro", className: "text-leaf" };
}

export function DailyGoalCircle({ day, active, onSelect }: DailyGoalCircleProps) {
  const state = tone(day);
  const progress = Math.max(0, Math.min(100, day.progress || 0));

  return (
    <button
      className={`focus-ring min-h-[108px] rounded-app border bg-white p-2 text-left shadow-soft ${active ? "border-ink" : "border-line"}`}
      type="button"
      onClick={onSelect}
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${state.color} ${progress}%, #F3F4F6 ${progress}% 100%)` }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-bold">{day.day}</div>
      </div>
      <div className="mt-2 text-center">
        <strong className="block text-xs">{formatBRL(day.spent)}</strong>
        <span className={`text-[11px] font-semibold ${state.className}`}>{Math.round(progress)}% / {state.label}</span>
      </div>
    </button>
  );
}
