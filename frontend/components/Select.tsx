"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

type SelectOption = {
  value: string | number;
  label: string;
  color?: string;
  icon?: React.ReactNode;
};

type SelectProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  aria?: {
    label?: string;
    description?: string;
  };
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  clearable = false,
  disabled = false,
  className = "",
  aria = {}
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchValue("");
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            const option = filteredOptions[highlightedIndex];
            onChange(option.value);
            setOpen(false);
            setSearchValue("");
            setHighlightedIndex(0);
          }
          break;
        case "Escape":
          event.preventDefault();
          setOpen(false);
          setSearchValue("");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredOptions, highlightedIndex, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && open) {
      const highlighted = listRef.current.querySelector("[data-highlighted]");
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, open]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={`field w-full flex items-center justify-between gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={aria.label || placeholder}
        aria-describedby={aria.description ? "select-description" : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={selectedOption ? "text-ink" : "text-muted"}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && clearable && (
            <button
              type="button"
              className="text-muted hover:text-ink transition p-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchValue("");
              }}
              aria-label="Limpar seleção"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-muted transition ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-app border border-white/80 bg-white shadow-lift overflow-hidden">
          <div className="p-2 border-b border-line">
            <input
              ref={inputRef}
              type="text"
              className="field w-full text-sm"
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setHighlightedIndex(0);
              }}
              autoFocus
              aria-label="Buscar opções"
            />
          </div>

          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto"
            role="listbox"
            aria-label={aria.label || placeholder}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                    index === highlightedIndex
                      ? "bg-gradient-to-r from-pulse to-plum text-white"
                      : "hover:bg-white/75 text-ink"
                  }`}
                  data-highlighted={index === highlightedIndex}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearchValue("");
                    setHighlightedIndex(0);
                  }}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.color && (
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <span className="ml-auto text-lg">✓</span>}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted">
                Nenhuma opção encontrada
              </div>
            )}
          </div>
        </div>
      )}

      {aria.description && (
        <p id="select-description" className="text-xs text-muted mt-1">
          {aria.description}
        </p>
      )}
    </div>
  );
}
