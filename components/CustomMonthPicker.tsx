"use client";

/** Seletor de mês e ano sem depender do controle nativo do navegador. */

import { CalendarDays, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import CustomSelect, { type CustomSelectOption } from "./CustomSelect";

interface CustomMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const monthOptions: CustomSelectOption[] = monthNames.map((name, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: name,
}));

/** Combina seletores temáticos de mês e ano em um painel compacto. */
export default function CustomMonthPicker({
  value,
  onChange,
  className = "",
}: CustomMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [selectedYear, selectedMonth] = value.split("-");
  const yearOptions: CustomSelectOption[] = Array.from(
    { length: 36 },
    (_, index) => String(new Date().getFullYear() - 25 + index),
  ).map((yearValue) => ({ value: yearValue, label: yearValue }));
  if (!yearOptions.some((option) => option.value === selectedYear)) {
    yearOptions.push({ value: selectedYear, label: selectedYear });
    yearOptions.sort((first, second) => Number(first.value) - Number(second.value));
  }
  const monthLabel = monthNames[Number(selectedMonth) - 1] ?? "Mês";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function openPicker(): void {
    setYear(Number(selectedYear));
    setIsOpen(true);
  }

  function selectMonth(month: string): void {
    onChange(`${year}-${month}`);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Selecionar mês e ano"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-300 outline-none transition hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays aria-hidden="true" size={16} className="shrink-0 text-zinc-500" />
          <span className="truncate text-xs">
            {monthLabel} {selectedYear}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`shrink-0 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Selecionar mês e ano"
          className="absolute right-0 top-full z-40 mt-1 w-64 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
        >
          <label className="block text-xs font-medium text-zinc-400">
            Ano
            <CustomSelect
              ariaLabel="Ano"
              value={String(year)}
              options={yearOptions}
              onChange={(nextYear) => setYear(Number(nextYear))}
              className="mt-1"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {monthOptions.map((monthOption) => {
              const isSelected =
                Number(selectedYear) === year && selectedMonth === monthOption.value;
              return (
                <button
                  key={monthOption.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectMonth(monthOption.value)}
                  className={`min-h-10 rounded-lg px-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    isSelected
                      ? "custom-select-option-active bg-violet-500/15 font-medium text-violet-200"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {monthOption.label}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
