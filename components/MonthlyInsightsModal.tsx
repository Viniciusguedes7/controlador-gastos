"use client";

import { useEffect } from "react";
import { ChartPie, X } from "lucide-react";
import type { Category, Transaction } from "../types/finance";

interface MonthlyInsightsModalProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
  monthlySpendingLimit: number | null;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

export default function MonthlyInsightsModal({
  transactions,
  categories,
  selectedMonth,
  monthlySpendingLimit,
  onClose,
}: MonthlyInsightsModalProps) {
  const [year, monthNumber] = selectedMonth.split("-").map(Number);
  const previousDate = new Date(year, monthNumber - 2, 1);
  const previousMonth = `${previousDate.getFullYear()}-${String(
    previousDate.getMonth() + 1,
  ).padStart(2, "0")}`;
  const currentTransactions = transactions.filter((item) =>
    item.date.startsWith(selectedMonth),
  );
  const previousTransactions = transactions.filter((item) =>
    item.date.startsWith(previousMonth),
  );
  const paidIncome = currentTransactions.reduce(
    (total, item) =>
      item.type === "income" && item.status === "paid" ? total + item.amount : total,
    0,
  );
  const paidExpenses = currentTransactions.reduce(
    (total, item) =>
      item.type === "expense" && item.status === "paid" ? total + item.amount : total,
    0,
  );
  const pendingExpenses = currentTransactions.reduce(
    (total, item) =>
      item.type === "expense" && item.status === "pending" ? total + item.amount : total,
    0,
  );
  const savings = Math.max(paidIncome - paidExpenses, 0);
  const deficit = Math.max(paidExpenses - paidIncome, 0);
  const chartTotal = savings + paidExpenses + pendingExpenses;
  const segments = [
    { label: "Economizado / saldo", value: savings, color: "#34d399" },
    { label: "Gastos pagos", value: paidExpenses, color: "#fb7185" },
    { label: "Despesas pendentes", value: pendingExpenses, color: "#fbbf24" },
  ];
  const savingsDegrees = chartTotal > 0 ? (savings / chartTotal) * 360 : 0;
  const paidDegrees =
    chartTotal > 0 ? ((savings + paidExpenses) / chartTotal) * 360 : 0;
  const chartStyle = {
    background:
      chartTotal > 0
        ? `conic-gradient(#34d399 0deg ${savingsDegrees}deg, #fb7185 ${savingsDegrees}deg ${paidDegrees}deg, #fbbf24 ${paidDegrees}deg 360deg)`
        : "#3f3f46",
  };
  const expenseByCategory = new Map<string, number>();
  for (const transaction of currentTransactions) {
    if (transaction.type === "expense") {
      expenseByCategory.set(
        transaction.categoryId,
        (expenseByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
    }
  }
  const totalExpenses = paidExpenses + pendingExpenses;
  const topCategoryEntry = [...expenseByCategory.entries()].sort(
    (first, second) => second[1] - first[1],
  )[0];
  const topCategory = topCategoryEntry
    ? categories.find((category) => category.id === topCategoryEntry[0])
    : undefined;
  const topCategoryPercentage =
    topCategoryEntry && totalExpenses > 0
      ? (topCategoryEntry[1] / totalExpenses) * 100
      : 0;
  const thisMonthExpenses = currentTransactions.reduce(
    (total, item) => total + (item.type === "expense" ? item.amount : 0),
    0,
  );
  const lastMonthExpenses = previousTransactions.reduce(
    (total, item) => total + (item.type === "expense" ? item.amount : 0),
    0,
  );
  const expenseChange =
    lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : null;
  const today = getLocalDateKey(new Date());
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = getLocalDateKey(nextWeekDate);
  const upcomingBills = currentTransactions.filter(
    (item) =>
      item.type === "expense" &&
      item.status === "pending" &&
      item.date >= today &&
      item.date <= nextWeek,
  );
  const isWithinPlan =
    monthlySpendingLimit !== null && monthlySpendingLimit > 0
      ? totalExpenses <= monthlySpendingLimit
      : savings > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        aria-label="Fechar insights"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-insights-title"
        className="relative z-10 max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-300">
              <ChartPie aria-hidden="true" size={19} />
              <h2 id="monthly-insights-title" className="text-lg font-semibold text-zinc-100">
                Insights do mês
              </h2>
            </div>
            <p className="mt-1 text-sm capitalize text-zinc-400">
              {formatMonth(selectedMonth)} · comparação com {formatMonth(previousMonth)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-5">
          <h3 className="font-semibold text-zinc-100">Economias e distribuição do mês</h3>
          <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(190px,0.8fr)_1fr]">
            <div className="flex justify-center">
              <div
                role="img"
                aria-label={
                  chartTotal > 0
                    ? `Gráfico: ${currencyFormatter.format(savings)} economizados, ${currencyFormatter.format(paidExpenses)} em gastos pagos e ${currencyFormatter.format(pendingExpenses)} pendentes`
                    : "Sem movimentações neste mês"
                }
                className="relative size-48 rounded-full"
                style={chartStyle}
              >
                <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-zinc-900 text-center">
                  <span className="text-xs text-zinc-400">Saldo do mês</span>
                  <strong className="mt-1 max-w-full px-1 text-sm text-zinc-100">
                    {currencyFormatter.format(savings - deficit)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {segments.map((segment) => {
                const percentage =
                  chartTotal > 0 ? (segment.value / chartTotal) * 100 : 0;
                return (
                  <div key={segment.label} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate text-sm text-zinc-300">
                        {segment.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-right text-sm text-zinc-200">
                      {currencyFormatter.format(segment.value)}
                      <span className="ml-1 text-xs text-zinc-500">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-300">
            {chartTotal === 0
              ? "Ainda não há movimentações neste mês. Seus próximos lançamentos aparecerão aqui."
              : deficit > 0
                ? `As despesas pagas superaram as receitas em ${currencyFormatter.format(deficit)}. Revise os gastos para recuperar o equilíbrio.`
                : monthlySpendingLimit !== null && monthlySpendingLimit > 0
                  ? `Você guardou ${currencyFormatter.format(savings)} neste mês e está ${isWithinPlan ? "dentro" : "acima"} do seu limite de gastos.`
                  : `Você guardou ${currencyFormatter.format(savings)} neste mês${savings === 0 ? "; as receitas pagas foram totalmente comprometidas." : "."}`}
          </p>
        </section>

        <section aria-label="Indicadores do mês" className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Maior categoria</h3>
            {topCategoryEntry && topCategory && totalExpenses > 0 ? (
              <>
                <p className="mt-2 text-sm text-zinc-300">
                  {topCategory.name} representa {topCategoryPercentage.toFixed(1)}% das suas despesas.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Essa categoria é atualmente a maior responsável pelos seus gastos.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">
                Ainda não há despesas suficientes para destacar uma categoria.
              </p>
            )}
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Comparação mensal</h3>
            {expenseChange === null ? (
              <p className="mt-2 text-sm text-zinc-400">
                {thisMonthExpenses > 0
                  ? "Não houve despesas no mês anterior para calcular uma comparação."
                  : "Sem despesas para comparar neste período."}
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-zinc-300">
                  Você gastou {Math.abs(expenseChange).toFixed(1)}%{" "}
                  {expenseChange <= 0 ? "menos" : "mais"} que no mês anterior.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {expenseChange <= 0
                    ? "Boa evolução: você reduziu ou manteve seus gastos."
                    : "Atenção: suas despesas aumentaram em relação ao mês anterior."}
                </p>
              </>
            )}
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:col-span-2">
            <h3 className="text-sm font-semibold text-zinc-100">Próximos vencimentos</h3>
            <p className="mt-2 text-sm text-zinc-300">
              {upcomingBills.length > 0
                ? `Atenção: ${upcomingBills.length} ${upcomingBills.length === 1 ? "conta está" : "contas estão"} próximas do vencimento.`
                : "Nenhuma conta pendente vence nos próximos 7 dias."}
            </p>
          </article>
        </section>
      </section>
    </div>
  );
}
