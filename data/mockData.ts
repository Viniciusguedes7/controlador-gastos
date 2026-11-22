/**
 * Fornece categorias padrão e identifica lançamentos de demonstração antigos.
 * As transações começam vazias para que o usuário registre apenas os próprios dados.
 */

import type { Category } from "../types/finance";

/** Gera a chave do mês local atual no formato exigido pelo seletor. */
export function getCurrentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

/** Categorias iniciais com limites mensais e cores usadas na interface. */
export const initialCategories: Category[] = [
  { id: "alimentacao", name: "Alimentação", color: "#34d399", budgetLimit: 1200 },
  { id: "moradia", name: "Moradia", color: "#fbbf24", budgetLimit: 1500 },
  { id: "lazer", name: "Lazer", color: "#a78bfa", budgetLimit: 600 },
  { id: "assinaturas", name: "Assinaturas", color: "#818cf8", budgetLimit: 250 },
  { id: "transporte", name: "Transporte", color: "#2dd4bf", budgetLimit: 400 },
  { id: "saude", name: "Saúde", color: "#fb7185", budgetLimit: 500 },
  { id: "educacao", name: "Educação", color: "#60a5fa", budgetLimit: 300 },
  { id: "renda", name: "Renda", color: "#34d399", budgetLimit: 0 },
];

/** IDs antigos removidos do armazenamento para apagar somente os exemplos pré-carregados. */
export const legacyDemoTransactionIds = new Set([
  "lancamento-1",
  "lancamento-2",
  "lancamento-3",
  "lancamento-4",
  "lancamento-5",
  "lancamento-6",
]);
