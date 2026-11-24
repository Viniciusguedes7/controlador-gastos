"use client";

/**
 * Renderiza o resumo do mês, os limites de orçamento e as movimentações recentes.
 */

import { ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, ReceiptText } from "lucide-react";
import type { Category, Transaction } from "../types/finance";
import type { CategorySpending } from "../hooks/useFinance";
// Apresenta a comparação histórica das duas séries de movimentações.
import ComparisonChart from "./ComparisonChart";
import NetWorthChart from "./NetWorthChart";

/** Propriedades calculadas pela página e entregues ao Dashboard. */
interface DashboardTabProps {
  /** Receita somada no mês selecionado. */
  totalIncome: number;
  /** Despesa somada no mês selecionado. */
  totalExpenses: number;
  /** Saldo líquido no período consultado. */
  currentBalance: number;
  /** Gastos agrupados por categoria, já limitados ao mês selecionado. */
  categorySpending: CategorySpending[];
  /** Histórico completo usado pelo gráfico e pela lista recente. */
  transactions: Transaction[];
  /** Mês atualmente selecionado no filtro principal, no formato YYYY-MM. */
  selectedMonth: string;
  /** Ano do mês atualmente selecionado no filtro principal. */
  selectedYear: number;
  /** Categorias completas para associar nome e cor aos lançamentos. */
  categories: Category[];
  /** Ação que leva o usuário à lista completa de transações. */
  onViewTransactions: () => void;
  /** Marca uma despesa pendente como paga. */
  onToggleStatus: (transactionId: string) => void;
}

/** Formata valores para a moeda local brasileira. */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata a data ISO sem conversões de fuso horário. */
function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** Retorna uma data local em ISO para comparar vencimentos sem diferença de fuso. */
function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Define os estilos de cada cartão do resumo mensal. */
const summaryStyles = {
  income: {
    label: "Receitas do mês",
    icon: ArrowUpRight,
    card: "border-emerald-900/70 bg-emerald-950/45",
    iconColor: "text-emerald-300",
    labelColor: "text-emerald-300",
    badge: "bg-emerald-400/10 text-emerald-300",
  },
  expense: {
    label: "Despesas do mês",
    icon: ArrowDownRight,
    card: "border-rose-900/70 bg-rose-950/40",
    iconColor: "text-rose-300",
    labelColor: "text-rose-300",
    badge: "bg-rose-400/10 text-rose-300",
  },
  balance: {
    label: "Saldo atual",
    icon: CreditCard,
    card: "border-violet-900/70 bg-indigo-950/50",
    iconColor: "text-violet-300",
    labelColor: "text-violet-300",
    badge: "bg-violet-400/10 text-violet-200",
  },
};

/** Exibe os três indicadores financeiros e os dois painéis de acompanhamento. */
export default function DashboardTab({
  totalIncome,
  totalExpenses,
  currentBalance,
  categorySpending,
  transactions,
  selectedMonth,
  selectedYear,
  categories,
  onViewTransactions,
  onToggleStatus,
}: DashboardTabProps) {
  const monthlyBudget = categories.reduce(
    (total, category) => total + (category.budgetLimit > 0 ? category.budgetLimit : 0),
    0,
  );
  const availableBudget = monthlyBudget > 0 ? monthlyBudget : totalIncome;
  const remainingBudget = availableBudget - totalExpenses;
  const consumedPercentage =
    availableBudget > 0
      ? (totalExpenses / availableBudget) * 100
      : totalExpenses > 0
        ? 100
        : 0;
  const today = getLocalDateKey(new Date());
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = getLocalDateKey(nextWeek);
  const pendingExpenses = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.status === "pending")
    .sort((first, second) => first.date.localeCompare(second.date));
  const upcomingExpenses = pendingExpenses.filter(
    (transaction) => transaction.date <= nextWeekKey,
  );
  const totalPendingExpenses = pendingExpenses.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  /** Mantém somente os seis lançamentos recentes do mês selecionado. */
  const recentTransactions = transactions
    .filter((transaction) => transaction.date.startsWith(selectedMonth))
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 6);

  /** Projeta cada indicador no mesmo cartão para manter a hierarquia uniforme. */
  const summaryCards = [
    { key: "income", amount: totalIncome, note: "Entradas registradas neste mês" },
    { key: "expense", amount: totalExpenses, note: "Saídas registradas neste mês" },
    { key: "balance", amount: currentBalance, note: "Receitas menos despesas" },
  ] as const;

  return (
    <section aria-label="Resumo financeiro" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ key, amount, note }) => {
          const style = summaryStyles[key];
          const Icon = style.icon;

          return (
            <article
              key={key}
              className={`rounded-2xl border p-5 shadow-sm shadow-black/10 ${style.card}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${style.labelColor}`}>{style.label}</p>
                <Icon aria-hidden="true" size={19} className={style.iconColor} />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {currencyFormatter.format(amount)}
              </p>
              <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs ${style.badge}`}>
                {note}
              </p>
            </article>
          );
        })}
      </div>

      <section className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-100">
              Quanto ainda pode gastar no mês
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {monthlyBudget > 0
                ? "Com base nos limites definidos nas categorias."
                : "Com base nas receitas registradas neste mês."}
            </p>
          </div>
            <p
              className={`max-w-full break-words text-xl font-semibold tracking-tight sm:text-2xl ${
                remainingBudget < 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
            {currencyFormatter.format(remainingBudget)}
          </p>
        </div>
          <div
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-label="Orçamento mensal consumido"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(Math.max(consumedPercentage, 0), 100)}
          >
          <div
              className={`h-full rounded-full transition-all ${
                consumedPercentage > 100
                  ? "bg-rose-500"
                  : consumedPercentage >= 80
                    ? "bg-amber-400"
                    : "bg-emerald-500"
              }`}
            style={{ width: `${Math.min(Math.max(consumedPercentage, 0), 100)}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-zinc-500">
          {Math.round(consumedPercentage)}% do orçamento consumido
        </p>
        {remainingBudget < 0 && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-900/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-300"
          >
            Orçamento excedido em {currencyFormatter.format(Math.abs(remainingBudget))}.
          </p>
        )}
      </section>

      {/* Compara receitas e despesas usando o histórico completo da conta. */}
      <ComparisonChart
        transactions={transactions}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      <section className="grid min-w-0 gap-5 lg:grid-cols-2">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100">Despesas pendentes</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Total em aberto: {currencyFormatter.format(totalPendingExpenses)}
              </p>
            </div>
            <CalendarClock aria-hidden="true" size={19} className="shrink-0 text-amber-300" />
          </div>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Vencem nos próximos 7 dias
          </h3>
          {upcomingExpenses.length > 0 ? (
            <ul className="mt-2 divide-y divide-zinc-800/80">
              {upcomingExpenses.map((transaction) => {
                const daysRemaining = Math.round(
                  (new Date(`${transaction.date}T00:00:00`).getTime() -
                    new Date(`${today}T00:00:00`).getTime()) /
                    86400000,
                );
                const dueLabel =
                  daysRemaining < 0
                    ? "Atrasada"
                    : daysRemaining === 0
                      ? "Vence hoje"
                      : `Vence em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;

                return (
                  <li key={transaction.id} className="flex min-w-0 items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {transaction.description}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          daysRemaining < 0 ? "text-rose-400" : "text-amber-300"
                        }`}
                      >
                        {dueLabel} · {formatDate(transaction.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-zinc-200">
                      {currencyFormatter.format(transaction.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(transaction.id)}
                      className="shrink-0 rounded-lg bg-emerald-400/10 px-2.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
                      aria-label={`Pagar ${transaction.description}`}
                    >
                      Pagar
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-700 px-3 py-5 text-center text-sm text-zinc-500">
              Nenhuma conta vencida ou com vencimento nesta semana.
            </p>
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100">Todas as despesas pendentes</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {pendingExpenses.length}{" "}
                {pendingExpenses.length === 1 ? "conta em aberto" : "contas em aberto"} ·{" "}
                {currencyFormatter.format(totalPendingExpenses)}
              </p>
            </div>
            <button
              type="button"
              onClick={onViewTransactions}
              className="shrink-0 text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Ver transações
            </button>
          </div>
          {pendingExpenses.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-800/80">
              {pendingExpenses.slice(0, 5).map((transaction) => (
                <li key={transaction.id} className="flex min-w-0 items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDate(transaction.date)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-zinc-200">
                    {currencyFormatter.format(transaction.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(transaction.id)}
                    className="shrink-0 rounded-lg bg-emerald-400/10 px-2.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
                    aria-label={`Pagar ${transaction.description}`}
                  >
                    Pagar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-700 px-3 py-5 text-center text-sm text-zinc-500">
              Você não tem despesas pendentes.
            </p>
          )}
          {pendingExpenses.length > 5 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Mais {pendingExpenses.length - 5} contas pendentes.
            </p>
          )}
        </article>
      </section>

      <NetWorthChart transactions={transactions} selectedMonth={selectedMonth} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Orçamentos por categoria</h2>
              <p className="mt-1 text-xs text-zinc-500">Acompanhe seus limites mensais</p>
            </div>
            <ReceiptText aria-hidden="true" size={19} className="text-zinc-500" />
          </div>

          {categorySpending.length > 0 ? (
            <div className="space-y-6">
              {categorySpending.map(({ category, spent }) => {
                const hasLimit = category.budgetLimit > 0;
                const percentage = hasLimit ? (spent / category.budgetLimit) * 100 : 0;
                const barColor =
                  percentage > 100
                    ? "bg-rose-500"
                    : percentage >= 80
                      ? "bg-amber-400"
                      : "bg-emerald-500";

                return (
                  <div key={category.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate text-sm font-medium text-zinc-200">
                          {category.name}
                        </span>
                      </div>
                      <p className="shrink-0 text-xs text-zinc-300 sm:text-sm">
                        <span className="font-semibold text-zinc-100">
                          {currencyFormatter.format(spent)}
                        </span>
                        <span className="text-zinc-500">
                          {hasLimit ? ` / ${currencyFormatter.format(category.budgetLimit)}` : " / sem limite"}
                        </span>
                      </p>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-zinc-800"
                      role="progressbar"
                      aria-label={`Orçamento de ${category.name}`}
                      aria-valuemin={0}
                      aria-valuemax={category.budgetLimit || 0}
                      aria-valuenow={spent}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${hasLimit ? Math.min(percentage, 100) : 0}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-zinc-500">
                      {hasLimit
                        ? `${Math.round(percentage)}% do limite`
                        : "Categoria sem limite definido"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
              Crie uma categoria para acompanhar seus orçamentos.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Últimas transações</h2>
              <p className="mt-1 text-xs text-zinc-500">Movimentações deste mês</p>
            </div>
            <button
              type="button"
              onClick={onViewTransactions}
              className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Ver todas
            </button>
          </div>
          {recentTransactions.length > 0 ? (
            <ul className="divide-y divide-zinc-800/80">
              {recentTransactions.map((transaction) => {
                const category = categories.find(
                  (item) => item.id === transaction.categoryId,
                );
                const isIncome = transaction.type === "income";

                return (
                  <li
                    key={transaction.id}
                    className="flex items-center gap-3 px-5 py-4 sm:px-6"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                      {isIncome ? (
                        <ArrowUpRight aria-hidden="true" size={17} />
                      ) : (
                        <ArrowDownRight aria-hidden="true" size={17} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {transaction.description}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDate(transaction.date)}</p>
                    </div>
                    <span
                      className="hidden max-w-28 truncate rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-block"
                      style={{
                        color: category?.color ?? "#a1a1aa",
                        backgroundColor: category ? `${category.color}20` : "#27272a",
                      }}
                    >
                      {category?.name ?? "Sem categoria"}
                    </span>
                    <p
                      className={`shrink-0 text-right text-sm font-semibold ${
                        isIncome ? "text-emerald-300" : "text-zinc-200"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {currencyFormatter.format(transaction.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">
              Nenhuma transação encontrada neste mês.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
