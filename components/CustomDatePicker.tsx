"use client";

/** Calendário acessível que mantém as datas no formato local YYYY-MM-DD. */

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface CustomDatePickerProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getToday(): string {
  return formatLocalDate(new Date());
}

/** Seletor de data com navegação mensal e ações rápidas. */
export default function CustomDatePicker({
  ariaLabel,
  value,
  onChange,
  className = "mt-1.5",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseLocalDate(value);
  const today = getToday();
  const todayDate = parseLocalDate(today) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? todayDate,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarId = useId();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

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

  function openCalendar(): void {
    setVisibleMonth(selectedDate ?? parseLocalDate(getToday()) ?? new Date());
    setIsOpen(true);
  }

  function moveMonth(offset: number): void {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function chooseDate(nextValue: string): void {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={calendarId}
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-left text-sm text-zinc-100 outline-none transition hover:border-zinc-600 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20"
      >
        <span className={value ? "text-zinc-100" : "text-zinc-500"}>
          {selectedDate
            ? `${String(selectedDate.getDate()).padStart(2, "0")}/${String(
                selectedDate.getMonth() + 1,
              ).padStart(2, "0")}/${selectedDate.getFullYear()}`
            : "Selecione uma data"}
        </span>
        <CalendarDays aria-hidden="true" size={17} className="shrink-0 text-zinc-400" />
      </button>

      {isOpen && (
        <section
          id={calendarId}
          role="dialog"
          aria-label="Calendário"
          className="absolute left-0 top-full z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => moveMonth(-1)}
              className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <h3 className="text-sm font-semibold capitalize text-zinc-100">
              {monthFormatter.format(visibleMonth)}
            </h3>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => moveMonth(1)}
              className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
            {weekdays.map((weekday, index) => (
              <span key={`${weekday}-${index}`} className="py-2">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((day, index) =>
              day === null ? (
                <span key={`empty-${index}`} aria-hidden="true" className="min-h-10" />
              ) : (
                <button
                  key={day}
                  type="button"
                  aria-label={`${day} de ${monthFormatter.format(visibleMonth)}`}
                  aria-pressed={
                    selectedDate?.getFullYear() === year &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getDate() === day
                  }
                  onClick={() => chooseDate(formatLocalDate(new Date(year, month, day)))}
                  className={`min-h-10 rounded-lg text-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    value === formatLocalDate(new Date(year, month, day))
                      ? "bg-violet-500 font-semibold text-white hover:bg-violet-400"
                      : value !== today &&
                          today === formatLocalDate(new Date(year, month, day))
                        ? "text-violet-300"
                        : "text-zinc-300"
                  }`}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => chooseDate("")}
              className="min-h-10 rounded-lg px-3 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => chooseDate(today)}
              className="min-h-10 rounded-lg px-3 text-sm font-medium text-violet-300 transition hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Hoje
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
