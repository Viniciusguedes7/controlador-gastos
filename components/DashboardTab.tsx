"use client";

/**
 * Renderiza o resumo do mês, os limites de orçamento e as movimentações recentes.
 */

import { ArrowDownRight, ArrowUpRight, CreditCard, ReceiptText } from "lucide-react";
import type { Category, Transaction } from "../types/finance";
import type { CategorySpending } from "../hooks/useFinance";

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
  /** Lançamentos do mês, usados para compor a lista recente. */
  transactions: Transaction[];
  /** Categorias completas para associar nome e cor aos lançamentos. */
  categories: Category[];
  /** Ação que leva o usuário à lista completa de transações. */
  onViewTransactions: () => void;
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
  categories,
  onViewTransactions,
}: DashboardTabProps) {
  /** Mantém somente os seis lançamentos mais recentes para o painel compacto. */
  const recentTransactions = [...transactions]
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
