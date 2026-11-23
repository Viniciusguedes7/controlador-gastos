"use client";

// Importa o estado React usado para alternar entre as áreas financeiras.
import { useState } from "react";
// Lê o estado da sessão criada pelo provider raiz.
import { useSession } from "next-auth/react";
// Importa as três áreas acessíveis após autenticação.
import CategoriesTab from "../components/CategoriesTab";
import DashboardTab from "../components/DashboardTab";
import Navbar, { type FinanceTab } from "../components/Navbar";
import TransactionsTab from "../components/TransactionsTab";
// Apresenta a tela de entrada para pessoas sem sessão.
import LoginScreen from "../components/LoginScreen";
// Carrega os registros e mantém as operações otimistas do usuário.
import { useFinance } from "../hooks/useFinance";

// Renderiza os dados de uma conta autenticada em uma árvore isolada.
function FinanceApp({ userId }: { userId: string }) {
  // Controla qual das áreas está visível na navegação principal.
  const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
  // Busca dados e operações associados à identidade da sessão atual.
  const finance = useFinance(userId);

  // Abre a área de transações para facilitar o lançamento de uma movimentação.
  function openNewTransaction(): void {
    // Define a aba que contém o formulário de cadastro.
    setActiveTab("transactions");
  }

  // Apresenta o painel financeiro com cores e conteúdo adaptados ao tema ativo.
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mantém navegação, período e conta acessíveis no topo da aplicação. */}
      <Navbar
        activeTab={activeTab}
        selectedMonth={finance.selectedMonth}
        onTabChange={setActiveTab}
        onMonthChange={finance.setSelectedMonth}
        onNewTransaction={openNewTransaction}
      />
      {/* Centraliza o conteúdo e limita a largura de leitura em telas grandes. */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Explica ao usuário que os dados estão sendo carregados do PostgreSQL. */}
        {finance.isLoading && (
          <p role="status" className="mb-5 text-sm text-zinc-400">
            Carregando seus dados financeiros...
          </p>
        )}
        {/* Expõe falhas sem ocultar o estado de erro da consulta ou da gravação. */}
        {finance.actionError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
          >
            {finance.actionError}
          </p>
        )}
        {/* Resume o propósito da aba que está selecionada no momento. */}
        <div className="mb-6">
          {/* Identifica a seção financeira a que o título pertence. */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Visão geral
          </p>
          {/* Atualiza o título conforme a área aberta pelo usuário. */}
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {activeTab === "dashboard"
              ? "Suas finanças em um só lugar"
              : activeTab === "transactions"
                ? "Organize suas movimentações"
                : "Planeje seus limites"}
          </h1>
          {/* Explica como usar os dados para acompanhar o orçamento mensal. */}
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Acompanhe receitas, despesas e orçamentos para tomar decisões com mais tranquilidade.
          </p>
        </div>

        {/* Monta o resumo mensal somente quando a aba de dashboard está ativa. */}
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

        {/* Entrega listas e operações protegidas à tela de transações. */}
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
            onToggleStatus={finance.toggleTransactionStatus}
          />
        )}

        {/* Entrega categorias e operações otimistas à tela de orçamentos. */}
        {activeTab === "categories" && (
          <CategoriesTab
            categories={finance.categories}
            onAdd={finance.addCategory}
            onEdit={finance.editCategory}
            onRemove={finance.removeCategory}
          />
        )}

        {/* Esclarece que as informações são persistidas para a conta autenticada. */}
        <footer className="mt-10 border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-600">
          Seus dados ficam salvos com segurança na sua conta.
        </footer>
      </main>
    </div>
  );
}

// Decide entre verificar sessão, solicitar login e exibir o painel privado.
export default function Home() {
  // Consulta o provider antes de montar qualquer componente que acesse dados.
  const { data: session, status } = useSession();

  // Evita exibir login ou dados incorretos durante a verificação da sessão.
  if (status === "loading") {
    // Mostra uma indicação simples enquanto o NextAuth recupera a sessão.
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        {/* Comunica que a autenticação está sendo consultada. */}
        Verificando sua sessão...
      </main>
    );
  }

  // Mantém dados e ações inacessíveis na interface antes da autenticação.
  if (!session?.user?.id) {
    // Oferece login e escolha de tema sem montar o painel privado.
    return <LoginScreen />;
  }

  // Usa o ID como chave para desmontar e limpar os dados ao trocar de conta.
  return <FinanceApp key={session.user.id} userId={session.user.id} />;
}
