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
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        type="text"
        className="field pl-9 pr-9 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={placeholder}
      />
      {hasValue && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
