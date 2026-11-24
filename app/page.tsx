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
// Exibe os créditos e os canais de contato no rodapé da aplicação.
import CreatorFooter from "../components/CreatorFooter";
// Apresenta os dados pessoais e as preferências financeiras da conta.
import ProfileTab from "../components/ProfileTab";
import OnboardingWizard from "../components/OnboardingWizard";
// Carrega os registros e mantém as operações otimistas do usuário.
import { useFinance } from "../hooks/useFinance";
import type { TransactionStatus, TransactionType } from "../types/finance";

// Renderiza os dados de uma conta autenticada em uma árvore isolada.
function FinanceApp({
  userId,
  user,
}: {
  userId: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  // Controla qual das áreas está visível na navegação principal.
  const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
  // Abre a configuração guiada apenas quando a pessoa a solicita no menu.
  const [isGuidedSetupOpen, setIsGuidedSetupOpen] = useState(false);
  // Busca dados e operações associados à identidade da sessão atual.
  const finance = useFinance(userId);
  // Compartilha os filtros para que a Dashboard possa abrir a lista filtrada.
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<"all" | TransactionType>("all");
  const [transactionStatusFilter, setTransactionStatusFilter] =
    useState<"all" | TransactionStatus>("all");
  // Extrai o ano do filtro mensal para orientar os intervalos do gráfico.
  const selectedYear = Number(finance.selectedMonth.slice(0, 4));

  // Abre a área de transações para facilitar o lançamento de uma movimentação.
  function openNewTransaction(): void {
    // Abre o cadastro sem manter filtros de uma consulta anterior.
    finance.setSearchTerm("");
    finance.setCategoryFilter("all");
    finance.setShowAllMonths(false);
    setTransactionTypeFilter("all");
    setTransactionStatusFilter("all");
    setActiveTab("transactions");
  }

  // Abre todas as despesas pendentes, inclusive lançamentos de outros meses.
  function openPendingExpenses(): void {
    finance.setSearchTerm("");
    finance.setCategoryFilter("all");
    finance.setShowAllMonths(true);
    setTransactionTypeFilter("expense");
    setTransactionStatusFilter("pending");
    setActiveTab("transactions");
  }

  // Apresenta o painel financeiro com cores e conteúdo adaptados ao tema ativo.
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Mantém navegação, período e conta acessíveis no topo da aplicação. */}
      <Navbar
        activeTab={activeTab}
        selectedMonth={finance.selectedMonth}
        onTabChange={setActiveTab}
        onMonthChange={(month) => {
          finance.setSelectedMonth(month);
          finance.setShowAllMonths(false);
        }}
        onNewTransaction={openNewTransaction}
        onReviewTutorial={() => setIsGuidedSetupOpen(true)}
      />
      {/* Centraliza o conteúdo e limita a largura de leitura em telas grandes. */}
      <main className="mx-auto w-full min-w-0 max-w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:max-w-7xl">
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
                : activeTab === "categories"
                  ? "Planeje seus limites"
                  : "Seu perfil e planejamento"}
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
            transactions={finance.transactions}
            selectedMonth={finance.selectedMonth}
            selectedYear={selectedYear}
            categories={finance.categories}
            monthlySpendingLimit={finance.profile.monthlySpendingLimit}
            onViewTransactions={() => setActiveTab("transactions")}
            onViewPendingExpenses={openPendingExpenses}
            onToggleStatus={finance.toggleTransactionStatus}
            onRemoveTransaction={finance.removeTransaction}
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
            typeFilter={transactionTypeFilter}
            onTypeFilterChange={setTransactionTypeFilter}
            statusFilter={transactionStatusFilter}
            onStatusFilterChange={setTransactionStatusFilter}
            showAllMonths={finance.showAllMonths}
            onShowAllMonthsChange={finance.setShowAllMonths}
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
            monthlySpendingLimit={finance.profile.monthlySpendingLimit}
            onAdd={finance.addCategory}
            onEdit={finance.editCategory}
            onRemove={finance.removeCategory}
          />
        )}

        {/* Mantém os dados pessoais e as preferências fora do resumo principal. */}
        {activeTab === "profile" && !finance.isLoading && (
          <ProfileTab
            user={user}
            profile={finance.profile}
            transactions={finance.transactions}
            selectedMonth={finance.selectedMonth}
            onSave={finance.saveFinancialProfile}
          />
        )}

        {/* Esclarece que as informações são persistidas para a conta autenticada. */}
        <footer className="mt-10 border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-600">
          Seus dados ficam salvos com segurança na sua conta.
        </footer>
      </main>
      {/* Mantém créditos e contato no fluxo da página, abaixo do conteúdo principal. */}
      <CreatorFooter />
      {/* Só apresenta a configuração inicial quando a conta ainda não tem dados salvos. */}
      {!finance.isLoading &&
        finance.shouldShowOnboarding && (
          <OnboardingWizard
            initialProfile={finance.profile}
            initialCategories={finance.categories}
            onComplete={finance.finishOnboarding}
          />
        )}
      {!finance.isLoading && isGuidedSetupOpen && (
        <OnboardingWizard
          mode="review"
          initialProfile={finance.profile}
          initialCategories={finance.categories}
          onComplete={finance.saveGuidedSetup}
          onClose={() => setIsGuidedSetupOpen(false)}
        />
      )}
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
  return <FinanceApp key={session.user.id} userId={session.user.id} user={session.user} />;
}
