import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function addMonths(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <button className="btn-secondary h-10 w-10 px-0" type="button" onClick={() => onChange(addMonths(value, -1))} aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </button>
      <input className="field h-10 w-36" type="month" value={value} onChange={(event) => onChange(event.target.value)} />
      <button className="btn-secondary h-10 w-10 px-0" type="button" onClick={() => onChange(new Date().toISOString().slice(0, 7))} aria-label="Mês atual">
        <CalendarClock size={16} />
      </button>
      <button className="btn-secondary h-10 w-10 px-0" type="button" onClick={() => onChange(addMonths(value, 1))} aria-label="Próximo mês">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
