import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/IconButton";

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
      <IconButton icon={ChevronLeft} label="Mês anterior" onClick={() => onChange(addMonths(value, -1))} />
      <input className="field h-10 w-36" type="month" value={value} onChange={(event) => onChange(event.target.value)} />
      <IconButton icon={CalendarClock} label="Voltar para mês atual" onClick={() => onChange(new Date().toISOString().slice(0, 7))} />
      <IconButton icon={ChevronRight} label="Próximo mês" onClick={() => onChange(addMonths(value, 1))} />
    </div>
  );
}
