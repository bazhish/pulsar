import { formatBRL } from "@/lib/format";
import type { GoalDay } from "@/types/finance";

type DailyGoalCircleProps = {
  day: GoalDay;
  active?: boolean;
  onSelect?: () => void;
};

function tone(day: GoalDay) {
  if (day.status === "empty") return { color: "rgb(var(--color-line))", label: "Sem gasto", className: "text-muted" };
  if (day.status === "over") return { color: "#DC4C3F", label: "Acima", className: "text-coral" };
  if (day.progress >= 80) return { color: "#F4C430", label: "Atencao", className: "text-ink" };
  return { color: "#16A34A", label: "Dentro", className: "text-leaf" };
}

export function DailyGoalCircle({ day, active, onSelect }: DailyGoalCircleProps) {
  const state = tone(day);
  const progress = Math.max(0, Math.min(100, day.progress || 0));

  return (
    <button
      className={`focus-ring min-h-[108px] rounded-app border bg-surface/95 p-2 text-left shadow-soft transition hover:-translate-y-0.5 ${active ? "border-pulse ring-2 ring-pulse/20" : "border-line"}`}
      type="button"
      onClick={onSelect}
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${state.color} ${progress}%, rgb(var(--color-line)) ${progress}% 100%)` }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-base font-black">{day.day}</div>
      </div>
      <div className="mt-2 text-center">
        <strong className="metric-number block text-xs">{formatBRL(day.spent)}</strong>
        <span className={`text-[11px] font-semibold ${state.className}`}>{Math.round(progress)}% / {state.label}</span>
        {day.net !== 0 ? (
          <span className={day.net < 0 ? "mt-1 block text-[11px] font-semibold text-coral" : "mt-1 block text-[11px] font-semibold text-leaf"}>
            {day.net < 0 ? "" : "+"}{formatBRL(day.net)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
