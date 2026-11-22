"use client";

/**
 * Conecta o estado financeiro às abas e define o layout principal do aplicativo.
 */

import { useState } from "react";
import CategoriesTab from "../components/CategoriesTab";
import DashboardTab from "../components/DashboardTab";
import Navbar, { type FinanceTab } from "../components/Navbar";
import TransactionsTab from "../components/TransactionsTab";
import { useFinance } from "../hooks/useFinance";

/** Página de entrada que alterna entre o resumo e as telas de manutenção. */
export default function Home() {
  /** Controla qual das três áreas está aberta na navegação principal. */
  const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
  /** Reúne registros, filtros, totais e ações persistidas pelo navegador. */
  const finance = useFinance();

  /** Abre a área de transações para facilitar o lançamento de uma nova entrada. */
  function openNewTransaction(): void {
    setActiveTab("transactions");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar
        activeTab={activeTab}
        selectedMonth={finance.selectedMonth}
        onTabChange={setActiveTab}
        onMonthChange={finance.setSelectedMonth}
        onNewTransaction={openNewTransaction}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Visão geral
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {activeTab === "dashboard"
              ? "Suas finanças em um só lugar"
              : activeTab === "transactions"
                ? "Organize suas movimentações"
                : "Planeje seus limites"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Acompanhe receitas, despesas e orçamentos para tomar decisões com mais tranquilidade.
          </p>
        </div>

        {activeTab === "dashboard" && (
          <DashboardTab
            totalIncome={finance.totalIncome}
            totalExpenses={finance.totalExpenses}
            currentBalance={finance.currentBalance}
            categorySpending={finance.categorySpending}
            transactions={finance.monthlyTransactions}
            categories={finance.categories}
            onViewTransactions={() => setActiveTab("transactions")}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={finance.filteredTransactions}
            categories={finance.categories}
            searchTerm={finance.searchTerm}
            onSearchChange={finance.setSearchTerm}
            categoryFilter={finance.categoryFilter}
            onCategoryFilterChange={finance.setCategoryFilter}
            selectedMonth={finance.selectedMonth}
            onAdd={finance.addTransaction}
            onEdit={finance.editTransaction}
            onRemove={finance.removeTransaction}
          />
        )}

        {activeTab === "categories" && (
          <CategoriesTab
            categories={finance.categories}
            onAdd={finance.addCategory}
            onEdit={finance.editCategory}
            onRemove={finance.removeCategory}
          />
        )}

        <footer className="mt-10 border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-600">
          Seus dados ficam salvos neste navegador.
        </footer>
      </main>
    </div>
  );
}
