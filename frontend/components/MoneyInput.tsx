"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent } from "react";
import { centsFromText, formatMoneyInput, moneyToApiValue } from "@/lib/money";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "inputMode" | "name" | "onChange" | "type" | "value"> & {
  defaultValue?: number;
  name?: string;
  onValueChange?: (value: number) => void;
  value?: number;
};

const editingKeys = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Tab",
  "Enter",
  "Escape"
]);

export function MoneyInput({ defaultValue = 0, name, onValueChange, value, className = "field", ...props }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [innerValue, setInnerValue] = useState(() => moneyToApiValue(defaultValue));
  const currentValue = moneyToApiValue(value ?? innerValue);
  const displayValue = useMemo(() => formatMoneyInput(currentValue), [currentValue]);

  useEffect(() => {
    if (value === undefined) setInnerValue(moneyToApiValue(defaultValue));
  }, [defaultValue, value]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || value !== undefined) return undefined;
    const reset = () => setInnerValue(moneyToApiValue(defaultValue));
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, value]);

  function commit(nextValue: number) {
    const normalized = moneyToApiValue(nextValue);
    if (value === undefined) setInnerValue(normalized);
    onValueChange?.(normalized);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || editingKeys.has(event.key)) return;
    if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    commit(centsFromText(event.clipboardData.getData("text")));
  }

  return (
    <>
      <input
        {...props}
        className={className}
        inputMode="numeric"
        onChange={(event) => commit(centsFromText(event.target.value))}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        pattern="[0-9R$.,\s]*"
        ref={inputRef}
        type="text"
        value={displayValue}
      />
      {name ? <input name={name} type="hidden" value={moneyToApiValue(currentValue).toFixed(2)} /> : null}
    </>
  );
}
