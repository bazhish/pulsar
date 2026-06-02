type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <input
      className="focus-ring rounded border border-black/10 bg-white px-3 py-2 text-sm"
      type="month"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
