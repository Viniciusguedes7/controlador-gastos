"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "../types/finance";

interface NetWorthChartProps {
  transactions: Transaction[];
  selectedMonth: string;
}

interface NetWorthMonth {
  key: string;
  label: string;
  fullLabel: string;
  change: number;
  total: number;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const fullMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function calculateNetWorth(
  transactions: Transaction[],
  selectedMonth: string,
): NetWorthMonth[] {
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthlyChanges = new Map<string, number>();

  for (const transaction of transactions) {
    const key = transaction.date.slice(0, 7);
    if (key > selectedMonth || (transaction.type === "expense" && transaction.status !== "paid")) {
      continue;
    }

    const change = transaction.type === "income" ? transaction.amount : -transaction.amount;
    monthlyChanges.set(key, (monthlyChanges.get(key) ?? 0) + change);
  }

  const firstVisibleMonth = new Date(year, month - 12, 1);
  const firstVisibleKey = `${firstVisibleMonth.getFullYear()}-${String(
    firstVisibleMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  let runningTotal = 0;
  for (const [key, change] of monthlyChanges) {
    if (key < firstVisibleKey) {
      runningTotal += change;
    }
  }

  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(year, month - 1 - 11 + index, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const change = monthlyChanges.get(key) ?? 0;
    runningTotal += change;

    return {
      key,
      label: shortMonthFormatter.format(monthDate).replace(/\.$/, ""),
      fullLabel: fullMonthFormatter.format(monthDate),
      change,
      total: runningTotal,
    };
  });
}

export default function NetWorthChart({ transactions, selectedMonth }: NetWorthChartProps) {
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const months = useMemo(
    () => calculateNetWorth(transactions, selectedMonth),
    [selectedMonth, transactions],
  );
  const activeMonth = months.find((month) => month.key === activeMonthKey) ?? null;
  const minTotal = Math.min(0, ...months.map((month) => month.total));
  const maxTotal = Math.max(0, ...months.map((month) => month.total));
  const range = maxTotal - minTotal || 1;
  const chartTop = 18;
  const chartBottom = 148;
  const points = months.map((month, index) => ({
    ...month,
    x: 30 + (index * 540) / (months.length - 1),
    y: chartBottom - ((month.total - minTotal) / range) * (chartBottom - chartTop),
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;

  return (
    <section
      aria-labelledby="net-worth-title"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
    >
      <div>
        <h2 id="net-worth-title" className="text-base font-semibold text-zinc-100">
          Evolução do Patrimônio
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Saldo acumulado nos últimos 12 meses, considerando despesas pagas.
        </p>
      </div>

      {activeMonth && (
        <div role="status" className="mt-4 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs sm:grid-cols-3">
          <p className="font-semibold capitalize text-zinc-100">
            {activeMonth.fullLabel}
          </p>
          <p className="text-zinc-400">
            Variação:{" "}
            <span
              className={
                activeMonth.change >= 0
                  ? "font-semibold text-emerald-400"
                  : "font-semibold text-rose-400"
              }
            >
              {activeMonth.change > 0 ? "+" : ""}
              {currencyFormatter.format(activeMonth.change)}
            </span>
          </p>
          <p className="text-zinc-400">
            Patrimônio:{" "}
            <span className="font-semibold text-zinc-100">
              {currencyFormatter.format(activeMonth.total)}
            </span>
          </p>
        </div>
      )}

      <div className="mt-4 w-full min-w-0">
        <svg
          role="group"
          aria-label="Patrimônio acumulado por mês. Selecione um ponto para ver os detalhes."
          viewBox="0 0 600 190"
          className="block h-auto w-full overflow-visible"
        >
          {[0, 1, 2, 3].map((line) => {
            const y = chartTop + (line * (chartBottom - chartTop)) / 3;
            return (
              <line
                key={line}
                x1="20"
                x2="580"
                y1={y}
                y2={y}
                className="stroke-zinc-800"
                strokeDasharray="4 5"
              />
            );
          })}
          <path d={areaPath} className="fill-violet-500/10" />
          <path
            d={linePath}
            fill="none"
            className="stroke-violet-400"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point) => (
            <g key={point.key}>
              <circle
                cx={point.x}
                cy={point.y}
                r={activeMonthKey === point.key ? 6 : 4}
                className="cursor-pointer fill-violet-400 stroke-zinc-900 transition-all focus:outline-none"
                strokeWidth="3"
                role="button"
                tabIndex={0}
                aria-label={`${point.fullLabel}: variação ${currencyFormatter.format(
                  point.change,
                )}, patrimônio acumulado ${currencyFormatter.format(point.total)}`}
                onMouseEnter={() => setActiveMonthKey(point.key)}
                onFocus={() => setActiveMonthKey(point.key)}
                onClick={() => setActiveMonthKey(point.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveMonthKey(point.key);
                  }
                }}
              />
              {point.key.slice(5) === "01" || point.key === months[months.length - 1].key ? (
                <text
                  x={point.x}
                  y="177"
                  textAnchor="middle"
                  className="fill-zinc-500 text-[10px]"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
