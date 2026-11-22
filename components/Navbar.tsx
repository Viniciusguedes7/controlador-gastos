"use client";

/**
 * Apresenta a marca, o seletor de período e os atalhos das três áreas do app.
 */

import { CalendarDays, ChartNoAxesCombined, CirclePlus, Layers3, WalletCards } from "lucide-react";

/** Identifica qual seção está visível na página principal. */
export type FinanceTab = "dashboard" | "transactions" | "categories";

/** Propriedades necessárias para sincronizar a navegação com a página. */
interface NavbarProps {
  /** Seção selecionada no momento. */
  activeTab: FinanceTab;
  /** Mês selecionado no formato YYYY-MM. */
  selectedMonth: string;
  /** Função que atualiza a seção aberta. */
  onTabChange: (tab: FinanceTab) => void;
  /** Função que atualiza o mês consultado. */
  onMonthChange: (month: string) => void;
  /** Atalho para abrir o formulário de uma nova transação. */
  onNewTransaction: () => void;
}

/** Descreve os botões de navegação para evitar repetir a marcação. */
const navigationItems: { id: FinanceTab; label: string; icon: typeof ChartNoAxesCombined }[] = [
  { id: "dashboard", label: "Dashboard", icon: ChartNoAxesCombined },
  { id: "transactions", label: "Transações", icon: WalletCards },
  { id: "categories", label: "Categorias", icon: Layers3 },
];

/** Barra de navegação responsiva com o seletor compartilhado de mês. */
export default function Navbar({
  activeTab,
  selectedMonth,
  onTabChange,
  onMonthChange,
  onNewTransaction,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
              <WalletCards aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white sm:text-base">
                controlador-gastos
              </p>
              <p className="text-xs text-zinc-500">Seu dinheiro, com mais clareza</p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 lg:hidden">
            <CalendarDays aria-hidden="true" size={16} className="text-zinc-500" />
            <span className="sr-only">Mês de referência</span>
            <input
              aria-label="Mês de referência"
              className="w-[7.5rem] bg-transparent text-xs outline-none [color-scheme:dark]"
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
        </div>

        <nav aria-label="Navegação principal" className="flex items-center gap-2 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  activeTab === id
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                {label}
              </button>
            ))}
          </div>

          <label className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 lg:flex">
            <CalendarDays aria-hidden="true" size={16} className="text-zinc-500" />
            <span className="sr-only">Mês de referência</span>
            <input
              aria-label="Mês de referência"
              className="w-32 bg-transparent text-xs outline-none [color-scheme:dark]"
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex min-w-max items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 sm:px-4 sm:text-sm"
          >
            <CirclePlus aria-hidden="true" size={16} />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
