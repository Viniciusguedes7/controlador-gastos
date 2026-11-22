/**
 * Define os tipos compartilhados pelo controlador financeiro.
 * Centralizar os contratos ajuda a manter os dados consistentes entre as telas.
 */

/** Identifica se uma movimentação aumenta ou reduz o saldo. */
export type TransactionType = "income" | "expense";

/** Indica se a movimentação já foi concluída ou ainda está prevista. */
export type TransactionStatus = "paid" | "pending";

/** Representa uma categoria e seu limite planejado para o mês. */
export interface Category {
  /** Identificador único usado nas relações com as transações. */
  id: string;
  /** Nome exibido nos formulários, listas e gráficos. */
  name: string;
  /** Cor hexadecimal usada para personalizar os elementos da categoria. */
  color: string;
  /** Teto mensal da categoria, em reais. */
  budgetLimit: number;
}

/** Representa uma receita ou despesa registrada pelo usuário. */
export interface Transaction {
  /** Identificador único usado para editar ou excluir a movimentação. */
  id: string;
  /** Texto curto que explica a origem ou o motivo do lançamento. */
  description: string;
  /** Valor em reais; deve ser positivo e o tipo define o sentido financeiro. */
  amount: number;
  /** Tipo da movimentação, usado nos totais e na apresentação visual. */
  type: TransactionType;
  /** Identificador da categoria à qual a movimentação pertence. */
  categoryId: string;
  /** Data no formato ISO simplificado YYYY-MM-DD. */
  date: string;
  /** Situação de pagamento da movimentação. */
  status: TransactionStatus;
  /** Indica se o lançamento deve ser considerado recorrente. */
  isRecurring: boolean;
}
