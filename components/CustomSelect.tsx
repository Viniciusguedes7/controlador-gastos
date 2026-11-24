"use client";

/**
 * Select acessível com superfície e opções consistentes com os temas do aplicativo.
 */

import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

/** Opção exibida pelo seletor, com cor opcional para categorias e paletas. */
export interface CustomSelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: ReactNode;
  subtitle?: string;
}

/** Propriedades para controlar o seletor sem depender de elementos nativos. */
interface CustomSelectProps {
  ariaLabel: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Dropdown com suporte a teclado, clique externo e indicadores opcionais. */
export default function CustomSelect({
  ariaLabel,
  value,
  options,
  onChange,
  placeholder = "Selecione uma opção",
  className = "mt-1.5",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Fecha o menu ao clicar fora ou pressionar Escape.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent): void {
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

  // Move o foco para a opção ativa ao abrir ou navegar com o teclado.
  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, isOpen]);

  function openSelect(index = selectedIndex >= 0 ? selectedIndex : 0): void {
    setActiveIndex(index);
    setIsOpen(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSelect();
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    if (event.key === "Tab") {
      setIsOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    }
  }

  function selectOption(option: CustomSelectOption): void {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? setIsOpen(false) : openSelect())}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-left text-sm text-zinc-100 outline-none transition hover:border-zinc-600 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedOption?.icon && (
            <span aria-hidden="true" className="shrink-0">
              {selectedOption.icon}
            </span>
          )}
          {selectedOption?.color && (
            <span
              aria-hidden="true"
              className="category-color-swatch size-3 shrink-0 rounded-full"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="custom-select-listbox absolute left-0 top-full z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
        >
          {options.length > 0 ? (
            options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={activeIndex === index ? 0 : -1}
                  onClick={() => selectOption(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    isSelected
                      ? "custom-select-option-active bg-zinc-800 text-white"
                      : "text-zinc-300"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {option.icon && (
                      <span aria-hidden="true" className="shrink-0">
                        {option.icon}
                      </span>
                    )}
                    {option.color && (
                      <span
                        aria-hidden="true"
                        className="category-color-swatch size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.subtitle && (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {option.subtitle}
                        </span>
                      )}
                    </span>
                  </span>
                  {isSelected && <Check aria-hidden="true" size={15} />}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-zinc-500">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
