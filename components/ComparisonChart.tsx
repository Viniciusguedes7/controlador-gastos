"use client";

// Importa os recursos React usados para calcular os meses e controlar a seleção.
import { useId, useMemo, useState } from "react";
// Reutiliza o contrato financeiro compartilhado pelo restante da aplicação.
import type { Transaction } from "../types/finance";
import CustomSelect from "./CustomSelect";

// Define os dois intervalos oferecidos pelo seletor do gráfico.
type PeriodLength = 6 | 12;

// Reúne os totais e os rótulos necessários para desenhar um mês.
interface MonthlyComparison {
  // Chave do mês no formato YYYY-MM para localizar suas transações.
  key: string;
  // Abreviação exibida abaixo das barras.
  monthLabel: string;
  // Nome completo usado no tooltip.
  fullMonthLabel: string;
  // Soma das receitas do mês.
  income: number;
  // Soma das despesas do mês.
  expenses: number;
  // Diferença entre receitas e despesas.
  balance: number;
  // Quantidade de transações registradas no mês.
  transactionCount: number;
}

// Declara os dados necessários para comparar os períodos selecionados.
interface ComparisonChartProps {
  // Histórico completo para que os períodos anteriores também sejam exibidos.
  transactions: Transaction[];
  // Mês escolhido no filtro principal, no formato YYYY-MM.
  selectedMonth: string;
  // Ano do mês selecionado no filtro principal.
  selectedYear: number;
}

// Formata todos os valores apresentados no gráfico como moeda brasileira.
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Gera abreviações localizadas para os rótulos curtos dos meses.
const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

// Gera nomes localizados de mês e ano para o tooltip.
const fullMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

// Calcula os totais mensais sem alterar a lista original de transações.
function calculateMonthlyComparison(
  transactions: Transaction[],
  selectedMonth: string,
  selectedYear: number,
  periodLength: PeriodLength,
): MonthlyComparison[] {
  // Obtém a parte numérica do mês escolhido no seletor principal.
  const monthNumber = Number(selectedMonth.slice(5, 7));

  // Prepara uma chave rápida para somar cada transação no mês correspondente.
  const totalsByMonth = new Map<
    string,
    { income: number; expenses: number; transactionCount: number }
  >();

  // Agrupa receitas, despesas e quantidade de registros usando a data ISO.
  for (const transaction of transactions) {
    // Usa somente ano e mês, preservando a data sem conversões de fuso horário.
    const monthKey = transaction.date.slice(0, 7);
    // Lê os totais atuais ou inicializa o agrupamento do primeiro registro.
    const currentTotals = totalsByMonth.get(monthKey) ?? {
      income: 0,
      expenses: 0,
      transactionCount: 0,
    };

    // Soma o valor na série correspondente ao tipo da transação.
    if (transaction.type === "income") {
      currentTotals.income += transaction.amount;
    } else {
      currentTotals.expenses += transaction.amount;
    }

    // Inclui pendências neste comparativo para representar previsões de entrada e saída.
    currentTotals.transactionCount += 1;
    totalsByMonth.set(monthKey, currentTotals);
  }

  // Cria os meses em ordem cronológica, terminando no mês atualmente selecionado.
  return Array.from({ length: periodLength }, (_, index) => {
    // Calcula o deslocamento para incluir o mês selecionado como último item.
    const monthOffset = index - (periodLength - 1);
    // Usa o construtor de data para atravessar corretamente limites de ano.
    const monthDate = new Date(selectedYear, monthNumber - 1 + monthOffset, 1);
    // Formata a chave no mesmo padrão usado pelas transações persistidas.
    const monthKey = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1,
    ).padStart(2, "0")}`;
    // Obtém os totais acumulados para esse mês ou cria valores zerados.
    const totals = totalsByMonth.get(monthKey) ?? {
      income: 0,
      expenses: 0,
      transactionCount: 0,
    };

    // Retorna os valores e rótulos que a interface precisa para esse mês.
    return {
      key: monthKey,
      monthLabel: shortMonthFormatter.format(monthDate).replace(/\.$/, ""),
      fullMonthLabel: fullMonthFormatter.format(monthDate),
      income: totals.income,
      expenses: totals.expenses,
      balance: totals.income - totals.expenses,
      transactionCount: totals.transactionCount,
    };
  });
}

// Apresenta barras comparativas responsivas, legendas e detalhes interativos.
export default function ComparisonChart({
  transactions,
  selectedMonth,
  selectedYear,
}: ComparisonChartProps) {
  // Controla se o gráfico apresenta seis ou doze meses.
  const [periodLength, setPeriodLength] = useState<PeriodLength>(6);
  // Guarda o mês ativo para exibir seus valores detalhados.
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  // Associa o seletor e o tooltip aos controles acessíveis do componente.
  const tooltipId = useId();
  const periodOptions = [
    { value: "6", label: "Últimos 6 meses" },
    { value: "12", label: "Últimos 12 meses" },
  ];

  // Recalcula os agrupamentos quando os dados, o filtro ou o período mudarem.
  const monthlyData = useMemo(
    () =>
      calculateMonthlyComparison(
        transactions,
        selectedMonth,
        selectedYear,
        periodLength,
      ),
    [periodLength, selectedMonth, selectedYear, transactions],
  );

  // Define a escala comum para que as duas séries sejam comparáveis.
  const maximumAmount = Math.max(
    0,
    ...monthlyData.flatMap((month) => [month.income, month.expenses]),
  );
  // Verifica se há pelo menos um registro no intervalo escolhido.
  const hasTransactions = monthlyData.some((month) => month.transactionCount > 0);
  // Mantém a seleção válida mesmo quando o filtro altera os meses mostrados.
  const activeMonth =
    monthlyData.find((month) => month.key === activeMonthKey) ?? null;

  // Atualiza o seletor sem permitir valores fora das opções declaradas.
  function handlePeriodChange(value: string): void {
    // Define diretamente o período de seis meses quando essa opção é escolhida.
    if (value === "6") {
      setPeriodLength(6);
      return;
    }

    // Define diretamente o período de doze meses quando essa opção é escolhida.
    if (value === "12") {
      setPeriodLength(12);
    }
  }

  // Renderiza o card e mantém a interação utilizável por mouse, teclado e toque.
  return (
    <section
      aria-labelledby="comparison-chart-title"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
    >
      {/* Apresenta o título e o seletor sem competir com os dados do gráfico. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="comparison-chart-title"
            className="text-base font-semibold text-zinc-100"
          >
            Comparativo Mensal (Receitas vs. Despesas)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Compare os valores dos meses anteriores ao período selecionado.
          </p>
        </div>

        {/* Oferece os dois intervalos de forma compacta e compatível com teclado. */}
        <div className="flex shrink-0 items-center gap-2">
          <CustomSelect
            ariaLabel="Período do gráfico"
            value={String(periodLength)}
            options={periodOptions}
            onChange={handlePeriodChange}
            className="mt-0 w-44"
          />
        </div>
      </div>

      {/* Explica as cores das barras para leitura rápida das duas séries. */}
      <div
        aria-label="Legenda do gráfico"
        className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400"
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-emerald-500" />
          Receitas
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-rose-500" />
          Despesas
        </span>
      </div>

      {/* Reserva uma área sobre o gráfico para o tooltip flutuante sem cobrir as barras. */}
      {activeMonth && (
        <div className="relative mt-4 h-28">
          {/* Mantém o tooltip visível e centralizado acima das barras selecionadas. */}
          <div
            id={tooltipId}
            role="tooltip"
            className="absolute inset-x-0 top-0 z-10 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs shadow-lg sm:grid-cols-2 lg:grid-cols-4"
          >
            <p className="font-semibold capitalize text-zinc-100 sm:col-span-2 lg:col-span-4">
              {activeMonth.fullMonthLabel}
            </p>
            <p className="flex items-center justify-between gap-3 text-zinc-400">
              Receitas
              <span className="font-semibold text-emerald-400">
                {currencyFormatter.format(activeMonth.income)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3 text-zinc-400">
              Despesas
              <span className="font-semibold text-rose-400">
                {currencyFormatter.format(activeMonth.expenses)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3 text-zinc-400 sm:col-span-2">
              Saldo líquido
              <span
                className={`font-semibold ${
                  activeMonth.balance > 0
                    ? "text-emerald-400"
                    : activeMonth.balance < 0
                      ? "text-rose-400"
                      : "text-zinc-300"
                }`}
              >
                {currencyFormatter.format(activeMonth.balance)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Mantém o gráfico dentro do card e permite rolagem horizontal em telas estreitas. */}
      <div className="mt-5 w-full min-w-0 max-w-full overflow-hidden pb-2">
        {hasTransactions ? (
          <div className="relative w-full min-w-0">
            {/* Desenha linhas de referência sutis atrás das barras mensais. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-32"
            >
              {[0, 33, 66, 100].map((position) => (
                <span
                  key={position}
                  className="absolute inset-x-0 border-t border-zinc-800/80"
                  style={{ top: `${position}%` }}
                />
              ))}
            </div>

            {/* Faz cada mês funcionar como um alvo acessível para revelar detalhes. */}
            <div
              role="group"
              aria-label="Receitas e despesas por mês"
              className="relative grid h-40 items-end"
              style={{
                gridTemplateColumns: `repeat(${monthlyData.length}, minmax(0, 1fr))`,
              }}
            >
              {monthlyData.map((month) => {
                // Mede as alturas na mesma escala para facilitar a comparação.
                const incomeHeight =
                  maximumAmount > 0 ? (month.income / maximumAmount) * 100 : 0;
                const expensesHeight =
                  maximumAmount > 0 ? (month.expenses / maximumAmount) * 100 : 0;
                // Marca o mês atualmente selecionado ou apontado pelo usuário.
                const isActive = activeMonthKey === month.key;

                return (
                  <button
                    key={month.key}
                    type="button"
                    onClick={() =>
                      setActiveMonthKey((current) =>
                        current === month.key ? null : month.key,
                      )
                    }
                    aria-label={`${month.fullMonthLabel}: receitas ${currencyFormatter.format(
                      month.income,
                    )}, despesas ${currencyFormatter.format(
                      month.expenses,
                    )}, saldo ${currencyFormatter.format(month.balance)}`}
                    aria-pressed={isActive}
                    aria-describedby={isActive ? tooltipId : undefined}
                    className="flex min-w-0 cursor-pointer flex-col items-center justify-end gap-2 rounded-md pb-1 text-[11px] text-zinc-500 outline-none transition hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {/* Alinha as duas barras pela linha de base comum do gráfico. */}
                    <span
                      aria-hidden="true"
                      className="flex h-32 w-full items-end justify-center gap-1"
                    >
                      <span
                        className="w-2 rounded-t-sm bg-emerald-500 transition-[height] duration-300 sm:w-3"
                        style={{ height: `${incomeHeight}%` }}
                      />
                      <span
                        className="w-2 rounded-t-sm bg-rose-500 transition-[height] duration-300 sm:w-3"
                        style={{ height: `${expensesHeight}%` }}
                      />
                    </span>
                    {/* Identifica o mês mesmo quando a tela exige rolagem horizontal. */}
                    <span className="truncate capitalize">{month.monthLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Informa com clareza quando o período selecionado ainda não tem lançamentos. */
          <p
            role="status"
            className="rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500"
          >
            Nenhuma transação registrada neste período. Seus comparativos aparecerão aqui.
          </p>
        )}
      </div>

      {/* Mostra o intervalo exato usado para gerar a série mensal. */}
      {monthlyData.length > 0 && (
        <p className="mt-2 text-right text-[11px] text-zinc-500">
          {monthlyData[0].fullMonthLabel} a{" "}
          {monthlyData[monthlyData.length - 1].fullMonthLabel}
        </p>
      )}
    </section>
  );
}
