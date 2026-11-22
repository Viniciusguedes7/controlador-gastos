"use client";

/**
 * Reúne o estado financeiro, a persistência local e os cálculos usados nas telas.
 * A leitura do navegador acontece em um efeito para manter a hidratação previsível.
 */

import { useEffect, useMemo, useState } from "react";
import {
  getCurrentMonth,
  initialCategories,
  legacyDemoTransactionIds,
} from "../data/mockData";
import type { Category, Transaction } from "../types/finance";

/** Chave isolada para salvar e recuperar os dados deste aplicativo. */
const STORAGE_KEY = "controlador-gastos-dados-v1";

/** Estrutura persistida para manter categorias e transações no mesmo registro. */
interface FinanceStorage {
  /** Categorias salvas pelo usuário. */
  categories: Category[];
  /** Movimentações salvas pelo usuário. */
  transactions: Transaction[];
}

/** Valores derivados usados para desenhar o orçamento por categoria. */
export interface CategorySpending {
  /** Categoria à qual o gasto mensal pertence. */
  category: Category;
  /** Soma das despesas desta categoria no mês selecionado. */
  spent: number;
}

/** Confere se os dados carregados possuem o formato mínimo esperado. */
function isFinanceStorage(value: unknown): value is FinanceStorage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Partial<FinanceStorage>;
  return Array.isArray(data.categories) && Array.isArray(data.transactions);
}

/** Cria um identificador para novos registros no navegador. */
function createId(): string {
  return globalThis.crypto.randomUUID();
}

/** Hook principal para consultar e alterar os dados pessoais. */
export function useFinance() {
  /** Guarda as categorias atuais; a lista inicial é igual no servidor e no cliente. */
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  /** Guarda os lançamentos atuais; por padrão, não existem transações cadastradas. */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  /** Controla o mês filtrado e também o período dos totais do Dashboard. */
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  /** Texto usado para localizar descrição ou nome de categoria. */
  const [searchTerm, setSearchTerm] = useState("");
  /** Categoria opcional usada como filtro na lista de transações. */
  const [categoryFilter, setCategoryFilter] = useState("all");
  /** Bloqueia a gravação até terminar de carregar o localStorage. */
  const [isHydrated, setIsHydrated] = useState(false);

  /** Recupera os dados salvos somente no navegador, após a primeira renderização. */
  useEffect(() => {
    /** Adia a leitura para depois da montagem, fora do caminho de renderização. */
    const timerId = window.setTimeout(() => {
      const currentMonth = getCurrentMonth();

      try {
        const savedData = window.localStorage.getItem(STORAGE_KEY);

        if (savedData) {
          const parsedData: unknown = JSON.parse(savedData);

          if (isFinanceStorage(parsedData)) {
            setCategories(parsedData.categories);
            setTransactions(
              parsedData.transactions.filter(
                (transaction) => !legacyDemoTransactionIds.has(transaction.id),
              ),
            );
          } else {
            console.error("Os dados salvos do controlador financeiro têm formato inválido.");
          }
        }
      } catch (error) {
        console.error("Não foi possível carregar os dados financeiros salvos.", error);
      } finally {
        setSelectedMonth(currentMonth);
        setIsHydrated(true);
      }

    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  /** Persiste alterações depois que a leitura inicial do navegador foi concluída. */
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      const dataToSave: FinanceStorage = { categories, transactions };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Não foi possível salvar os dados financeiros no navegador.", error);
    }
  }, [categories, isHydrated, transactions]);

  /** Adiciona uma nova movimentação com identificador criado localmente. */
  function addTransaction(transaction: Omit<Transaction, "id">): void {
    setTransactions((currentTransactions) => [
      { ...transaction, id: createId() },
      ...currentTransactions,
    ]);
  }

  /** Substitui os dados da movimentação correspondente ao identificador. */
  function editTransaction(updatedTransaction: Transaction): void {
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction,
      ),
    );
  }

  /** Remove a movimentação selecionada da lista. */
  function removeTransaction(transactionId: string): void {
    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== transactionId),
    );
  }

  /** Adiciona uma categoria usando um identificador local único. */
  function addCategory(category: Omit<Category, "id">): void {
    setCategories((currentCategories) => [{ ...category, id: createId() }, ...currentCategories]);
  }

  /** Atualiza nome, cor ou orçamento de uma categoria existente. */
  function editCategory(updatedCategory: Category): void {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === updatedCategory.id ? updatedCategory : category,
      ),
    );
  }

  /** Remove a categoria e seus lançamentos para não deixar referências inválidas. */
  function removeCategory(categoryId: string): void {
    setCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== categoryId),
    );
    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.categoryId !== categoryId),
    );
    if (categoryFilter === categoryId) {
      setCategoryFilter("all");
    }
  }

  /** Retorna os lançamentos de um período no formato YYYY-MM. */
  function getTransactionsByMonth(month: string): Transaction[] {
    return transactions.filter((transaction) => transaction.date.startsWith(month));
  }

  /** Mantém somente registros do mês selecionado que atendem à busca e categoria. */
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    return transactions
      .filter((transaction) => transaction.date.startsWith(selectedMonth))
      .filter(
        (transaction) => categoryFilter === "all" || transaction.categoryId === categoryFilter,
      )
      .filter((transaction) => {
        if (!normalizedSearch) {
          return true;
        }

        const categoryName =
          categories.find((category) => category.id === transaction.categoryId)?.name ?? "";
        return `${transaction.description} ${categoryName}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch);
      })
      .sort((first, second) => second.date.localeCompare(first.date));
  }, [categories, categoryFilter, searchTerm, selectedMonth, transactions]);

  /** Filtra lançamentos do mês para derivar as somas exibidas no resumo. */
  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(selectedMonth)),
    [selectedMonth, transactions],
  );

  /** Soma receitas do mês sem alterar o estado original. */
  const totalIncome = useMemo(
    () =>
      monthlyTransactions.reduce(
        (total, transaction) =>
          transaction.type === "income" ? total + transaction.amount : total,
        0,
      ),
    [monthlyTransactions],
  );

  /** Soma despesas do mês sem alterar o estado original. */
  const totalExpenses = useMemo(
    () =>
      monthlyTransactions.reduce(
        (total, transaction) =>
          transaction.type === "expense" ? total + transaction.amount : total,
        0,
      ),
    [monthlyTransactions],
  );

  /** Calcula o saldo líquido do mês usando receitas menos despesas. */
  const currentBalance = totalIncome - totalExpenses;

  /** Calcula o total gasto por categoria, considerando somente despesas do mês. */
  const categorySpending = useMemo<CategorySpending[]>(
    () => {
      const categoriesWithExpenses = new Set(
        monthlyTransactions
          .filter((transaction) => transaction.type === "expense")
          .map((transaction) => transaction.categoryId),
      );

      return categories
        .filter((category) => category.budgetLimit > 0 || categoriesWithExpenses.has(category.id))
        .map((category) => ({
          category,
          spent: monthlyTransactions.reduce(
            (total, transaction) =>
              transaction.type === "expense" && transaction.categoryId === category.id
                ? total + transaction.amount
                : total,
            0,
          ),
        }));
    },
    [categories, monthlyTransactions],
  );

  return {
    categories,
    transactions,
    selectedMonth,
    setSelectedMonth,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    filteredTransactions,
    monthlyTransactions,
    totalIncome,
    totalExpenses,
    currentBalance,
    categorySpending,
    addTransaction,
    editTransaction,
    removeTransaction,
    addCategory,
    editCategory,
    removeCategory,
    getTransactionsByMonth,
  };
}
