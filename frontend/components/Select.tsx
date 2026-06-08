"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useDelayedPresence } from "@/lib/useDelayedPresence";

type SelectOption = {
  value: string | number;
  label: string;
  color?: string;
  icon?: ReactNode;
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

type DropdownPosition = {
  bottom?: number;
  left: number;
  maxHeight: number;
  top?: number;
  width: number;
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
  const [mounted, setMounted] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const { shouldRender: shouldRenderDropdown, state: dropdownState } = useDelayedPresence(open, 160);
  const descriptionId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = useMemo(
    () => options.filter((opt) => opt.label.toLowerCase().includes(searchValue.trim().toLowerCase())),
    [options, searchValue]
  );

  const updatePosition = useCallback(() => {
    const anchor = containerRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const spaceAbove = rect.top - viewportPadding - gap;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(220, Math.min(360, openUp ? spaceAbove : spaceBelow));
    setPosition({
      left: Math.max(viewportPadding, rect.left),
      width: rect.width,
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap })
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSearchValue("");
  }, []);

  const selectOption = useCallback((option: SelectOption) => {
    onChange(option.value);
    setHighlightedIndex(0);
    close();
  }, [close, onChange]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const selectedIndex = Math.max(0, filteredOptions.findIndex((option) => option.value === value));
    setHighlightedIndex(selectedIndex);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filteredOptions, open, updatePosition, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (filteredOptions.length ? (prev + 1) % filteredOptions.length : 0));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) => (filteredOptions.length ? (prev - 1 + filteredOptions.length) % filteredOptions.length : 0));
      }
      if (event.key === "Enter" && filteredOptions[highlightedIndex]) {
        event.preventDefault();
        selectOption(filteredOptions[highlightedIndex]);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, filteredOptions, highlightedIndex, open, selectOption]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const dropdown = shouldRenderDropdown && mounted && position ? createPortal(
    <div
      ref={dropdownRef}
      className={`floating-layer theme-surface overflow-hidden rounded-app border shadow-lift ${dropdownState === "open" ? "animate-dropdown-in" : "animate-dropdown-out"}`}
      style={{
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        top: position.top,
        bottom: position.bottom
      }}
    >
      <div className="border-b border-line p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="text"
            className="field min-h-10 w-full pl-9 pr-3 text-sm"
            placeholder="Buscar..."
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setHighlightedIndex(0);
            }}
            aria-label="Buscar opcoes"
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="overflow-y-auto p-1"
        id={listboxId}
        role="listbox"
        aria-label={aria.label || placeholder}
        style={{ maxHeight: Math.max(140, position.maxHeight - 58) }}
      >
        {filteredOptions.length ? filteredOptions.map((option, index) => {
          const highlighted = index === highlightedIndex;
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={`interactive-list-item flex min-h-10 w-full items-center gap-2 rounded-app px-3 py-2 text-left text-sm transition ${
                highlighted
                  ? "bg-pulse text-white"
                  : selected
                  ? "bg-pulse/12 text-ink ring-1 ring-pulse/35"
                  : "text-ink hover:bg-pulse/10"
              }`}
              data-highlighted={highlighted || undefined}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={selected}
            >
              {option.color ? <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: option.color }} /> : null}
              {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {selected ? <Check className="shrink-0" size={16} aria-hidden /> : null}
            </button>
          );
        }) : (
          <div className="px-3 py-4 text-center text-sm text-muted">Nenhuma opcao encontrada</div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={`field flex w-full items-center justify-between gap-2 ${open ? "border-pulse/60 shadow-soft" : ""} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={aria.label || placeholder}
        aria-describedby={aria.description ? descriptionId : undefined}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selectedOption?.icon ? <span className="shrink-0">{selectedOption.icon}</span> : null}
          {selectedOption?.color ? <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedOption.color }} /> : null}
          <span className={`truncate ${selectedOption ? "text-ink" : "text-muted"}`}>
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {clearable && selectedOption && value !== "" ? (
        <button
          type="button"
          className="focus-ring absolute right-9 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-app text-xs font-black text-muted transition hover:text-ink"
          onClick={(event) => {
            event.stopPropagation();
            onChange("");
            close();
          }}
          aria-label="Limpar selecao"
        >
          x
        </button>
      ) : null}

      {dropdown}

      {aria.description ? <p id={descriptionId} className="mt-1 text-xs text-muted">{aria.description}</p> : null}
    </div>
  );
}
