"use client";

import { Search, X } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  autoComplete = "off"
}: SearchInputProps) {
  const hasValue = value.length > 0;

  return (
    <div className={`group relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted transition group-focus-within:text-pulse" />
      <input
        type="text"
        className="field w-full pl-11 pr-11"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={placeholder}
      />
      {hasValue && (
        <button
          type="button"
          className="focus-ring animate-pop-in absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-app text-muted transition hover:bg-ink/5 hover:text-ink"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
