"use client";

// Importa os cálculos de mês e as ações que persistem os dados no servidor.
import { useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransaction,
  getFinanceData,
  saveGuidedSetup as persistGuidedSetup,
  toggleTransactionStatus,
  updateCategory,
  updateFinancialProfile,
  updateTransaction,
} from "../app/actions/finance";
// Compartilha os contratos usados tanto pelo banco quanto pelas telas.
import type {
  Category,
  FinancialProfile,
  GuidedSetupInput,
  Transaction,
} from "../types/finance";

// Retorna o mês local no formato exigido pelo seletor de período.
function getCurrentMonth(): string {
  // Lê a data local para não exibir o mês anterior por diferença de fuso.
  const now = new Date();
  // Completa com zero o mês de um dígito.
  const month = String(now.getMonth() + 1).padStart(2, "0");
  // Combina ano e mês no formato YYYY-MM.
  return `${now.getFullYear()}-${month}`;
}

// Retorna o dia civil local sem converter a data para UTC.
function getLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

// Define os valores derivados usados no painel de orçamento por categoria.
export interface CategorySpending {
  // Categoria relacionada ao valor calculado.
  category: Category;
  // Total de despesas da categoria no mês selecionado.
  spent: number;
}

// Gera uma chave temporária para desenhar um item antes de o banco retornar seu ID.
function createOptimisticId(): string {
  // Prefixa o UUID para distinguir claramente um registro ainda não persistido.
  return `optimistic-${globalThis.crypto.randomUUID()}`;
}

// Mantém todo o estado financeiro do usuário e aplica alterações otimistas.
export function useFinance(userId: string) {
  // Guarda as categorias carregadas da conta atualmente autenticada.
  const [categories, setCategories] = useState<Category[]>([]);
  // Guarda as transações persistidas e as alterações otimistas em andamento.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Mantém as preferências financeiras opcionais do perfil da conta.
  const [profile, setProfile] = useState<FinancialProfile>({
    monthlySalary: null,
    monthlySpendingLimit: null,
  });
  // Mantém a conclusão persistida do fluxo inicial desta conta.
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  // Diferencia novas contas de perfis legados que já tinham dados salvos.
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  // Controla o período utilizado pelos filtros e indicadores.
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth);
  // Permite que atalhos da Dashboard abram a lista sem limitar o mês.
  const [showAllMonths, setShowAllMonths] = useState(false);
  // Guarda o texto livre usado para procurar descrições e categorias.
  const [searchTerm, setSearchTerm] = useState("");
  // Guarda a categoria selecionada ou a opção para visualizar todas.
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Indica carregamento inicial ou troca de conta.
  const [isLoading, setIsLoading] = useState(true);
  // Expõe falhas da API na interface, sem fingir que a gravação teve sucesso.
  const [actionError, setActionError] = useState("");

  // Carrega registros privados somente quando existe uma identidade autenticada.
  useEffect(() => {
    // Impede consulta se a composição da tela violar o contrato de autenticação.
    if (!userId) {
      return;
    }

    // Ignora respostas antigas se a tela da conta for desmontada.
    let isCurrentRequest = true;

    // Busca dados exclusivamente no servidor, onde a sessão é validada novamente.
    getFinanceData(getLocalToday())
      .then((data) => {
        // Atualiza a tela somente se esta ainda for a conta ativa.
        if (isCurrentRequest) {
          setCategories(data.categories);
          setTransactions(data.transactions);
          setProfile(data.profile);
          setHasCompletedOnboarding(data.hasCompletedOnboarding);
          setShouldShowOnboarding(data.shouldShowOnboarding);
        }
      })
      .catch((error: unknown) => {
        // Registra o erro original para facilitar a investigação no servidor.
        console.error("Não foi possível carregar os dados financeiros.", error);
        // Mostra uma mensagem em vez de apresentar uma lista vazia como sucesso.
        if (isCurrentRequest) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar seus dados financeiros.",
          );
        }
      })
      .finally(() => {
        // Finaliza o indicador apenas para a solicitação que continua ativa.
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    // Marca a resposta anterior como obsoleta quando usuário ou componente mudar.
    return () => {
      isCurrentRequest = false;
    };
  }, [userId]);

  // Apresenta erro de uma gravação e o registra para diagnóstico.
  function reportActionError(message: string, error: unknown): void {
    // Registra a causa original em vez de ocultar erros de rede ou do servidor.
    console.error(message, error);
    // Prefere a mensagem validada pelo servidor e usa texto explícito como fallback.
    setActionError(error instanceof Error ? error.message : message);
  }

  // Persiste as preferências e atualiza o perfil somente após a confirmação do servidor.
  async function saveFinancialProfile(input: FinancialProfile): Promise<void> {
    setActionError("");
    try {
      const savedProfile = await updateFinancialProfile(input);
      setProfile(savedProfile);
    } catch (error) {
      reportActionError("Não foi possível salvar as preferências do perfil.", error);
      throw error;
    }
  }

  // Persiste o orçamento base, as categorias iniciais e a conclusão do fluxo.
  async function finishOnboarding(input: GuidedSetupInput): Promise<void> {
    setActionError("");
    try {
      const data = await persistGuidedSetup(input);
      setCategories(data.categories);
      setProfile(data.profile);
      setHasCompletedOnboarding(data.hasCompletedOnboarding);
      setShouldShowOnboarding(false);
    } catch (error) {
      reportActionError("Não foi possível concluir a configuração inicial.", error);
      throw error;
    }
  }

  // Salva alterações guiadas preservando IDs, categorias não editadas e histórico.
  async function saveGuidedSetup(input: GuidedSetupInput): Promise<void> {
    setActionError("");
    try {
      const data = await persistGuidedSetup(input);
      setCategories(data.categories);
      setProfile(data.profile);
      setHasCompletedOnboarding(data.hasCompletedOnboarding);
      setShouldShowOnboarding(false);
    } catch (error) {
      reportActionError("Não foi possível salvar as alterações da configuração guiada.", error);
      throw error;
    }
  }

  // Insere uma transação na tela e troca sua chave temporária após a persistência.
  async function addTransaction(input: Omit<Transaction, "id">): Promise<void> {
    // Remove alertas anteriores antes de iniciar uma nova gravação.
    setActionError("");
    // Cria um registro local para a lista responder sem esperar a rede.
    const optimisticTransaction: Transaction = { ...input, id: createOptimisticId() };
    // Exibe o novo lançamento imediatamente no topo da lista.
    setTransactions((current) => [optimisticTransaction, ...current]);

    try {
      // Persiste o item no banco e recebe o identificador definitivo.
      const savedTransaction = await createTransaction(input);
      // Substitui somente a transação provisória desta operação.
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === optimisticTransaction.id ? savedTransaction : transaction,
        ),
      );
    } catch (error) {
      // Remove o item provisório para que a interface reflita o banco após a falha.
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== optimisticTransaction.id),
      );
      // Comunica o problema para o usuário sem interromper as outras interações.
      reportActionError("Não foi possível criar a transação.", error);
    }
  }

  // Atualiza os dados de uma transação na tela antes de salvar a alteração.
  async function editTransaction(updatedTransaction: Transaction): Promise<void> {
    // Localiza a versão persistida para poder restaurá-la em caso de falha.
    const previousTransaction = transactions.find(
      (transaction) => transaction.id === updatedTransaction.id,
    );
    // Não tenta salvar um ID ausente do estado atual.
    if (!previousTransaction) {
      setActionError("A transação não está disponível nesta conta.");
      return;
    }
    // Limpa avisos anteriores e aplica o novo valor imediatamente.
    setActionError("");
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction,
      ),
    );

    try {
      // Confirma a alteração no servidor e recebe os valores normalizados.
      const savedTransaction = await updateTransaction(updatedTransaction);
      // Troca o valor otimista pela versão persistida, preservando outros itens.
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === savedTransaction.id ? savedTransaction : transaction,
        ),
      );
    } catch (error) {
      // Reverte apenas o registro que falhou, sem substituir toda a lista.
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === previousTransaction.id ? previousTransaction : transaction,
        ),
      );
      // Torna a falha explícita na página.
      reportActionError("Não foi possível atualizar a transação.", error);
    }
  }

  // Remove imediatamente uma transação e restaura sua posição se o banco falhar.
  async function removeTransaction(transactionId: string): Promise<void> {
    // Guarda o registro e sua posição original para montar um rollback localizado.
    const previousIndex = transactions.findIndex(
      (transaction) => transaction.id === transactionId,
    );
    const previousTransaction = transactions[previousIndex];
    // Interrompe com mensagem explícita se o item não estiver carregado.
    if (!previousTransaction) {
      setActionError("A transação não está disponível nesta conta.");
      return;
    }
    // Limpa avisos antigos e remove o item sem esperar pela rede.
    setActionError("");
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== transactionId),
    );

    try {
      // Solicita ao servidor a exclusão, que valida a propriedade do registro.
      await deleteTransaction(transactionId);
    } catch (error) {
      // Reinsere somente o item removido caso outra ação não o tenha restaurado.
      setTransactions((current) => {
        if (current.some((transaction) => transaction.id === transactionId)) {
          return current;
        }
        const restored = [...current];
        restored.splice(Math.min(previousIndex, restored.length), 0, previousTransaction);
        return restored;
      });
      // Exibe a falha e permite que a pessoa tente novamente.
      reportActionError("Não foi possível excluir a transação.", error);
    }
  }

  // Insere uma categoria provisória e depois troca seu ID pelo criado no banco.
  async function addCategory(input: Omit<Category, "id">): Promise<void> {
    // Limpa mensagens anteriores antes de iniciar o cadastro.
    setActionError("");
    // Cria uma categoria otimista com uma chave temporária única.
    const optimisticCategory: Category = { ...input, id: createOptimisticId() };
    // Mostra a nova categoria imediatamente nos filtros e formulários.
    setCategories((current) => [optimisticCategory, ...current]);

    try {
      // Persiste a categoria no banco e recebe o ID definitivo.
      const savedCategory = await createCategory(input);
      // Substitui apenas a categoria provisória correspondente a esta chamada.
      setCategories((current) =>
        current.map((category) =>
          category.id === optimisticCategory.id ? savedCategory : category,
        ),
      );
    } catch (error) {
      // Remove o rascunho local para que ele não pareça salvo.
      setCategories((current) =>
        current.filter((category) => category.id !== optimisticCategory.id),
      );
      // Informa o erro de persistência à página.
      reportActionError("Não foi possível criar a categoria.", error);
    }
  }

  // Atualiza a categoria imediatamente e recupera seus valores em caso de falha.
  async function editCategory(updatedCategory: Category): Promise<void> {
    // Guarda a categoria atual para desfazer somente esta alteração.
    const previousCategory = categories.find(
      (category) => category.id === updatedCategory.id,
    );
    // Recusa alterações para IDs que não pertencem ao estado carregado.
    if (!previousCategory) {
      setActionError("A categoria não está disponível nesta conta.");
      return;
    }
    // Limpa mensagens antigas e atualiza os dados renderizados.
    setActionError("");
    setCategories((current) =>
      current.map((category) =>
        category.id === updatedCategory.id ? updatedCategory : category,
      ),
    );

    try {
      // Envia a alteração e aguarda a confirmação do servidor.
      const savedCategory = await updateCategory(updatedCategory);
      // Usa o registro persistido para manter a tela alinhada ao banco.
      setCategories((current) =>
        current.map((category) =>
          category.id === savedCategory.id ? savedCategory : category,
        ),
      );
    } catch (error) {
      // Reverte apenas a categoria cujo salvamento falhou.
      setCategories((current) =>
        current.map((category) =>
          category.id === previousCategory.id ? previousCategory : category,
        ),
      );
      // Mantém a falha visível e acionável.
      reportActionError("Não foi possível atualizar a categoria.", error);
    }
  }

  // Exclui uma categoria e suas transações da tela, restaurando-as se a API falhar.
  async function removeCategory(categoryId: string): Promise<void> {
    // Guarda a categoria selecionada para possibilitar a reversão.
    const previousCategory = categories.find((category) => category.id === categoryId);
    // Guarda transações em cascata e suas posições originais.
    const removedTransactions = transactions
      .map((transaction, index) => ({ transaction, index }))
      .filter(({ transaction }) => transaction.categoryId === categoryId);
    // Interrompe quando a categoria não faz parte dos dados carregados.
    if (!previousCategory) {
      setActionError("A categoria não está disponível nesta conta.");
      return;
    }
    // Limpa avisos anteriores e atualiza ambas as listas de forma imediata.
    setActionError("");
    setCategories((current) =>
      current.filter((category) => category.id !== categoryId),
    );
    setTransactions((current) =>
      current.filter((transaction) => transaction.categoryId !== categoryId),
    );
    // Remove o filtro selecionado para não manter referência à categoria excluída.
    if (categoryFilter === categoryId) {
      setCategoryFilter("all");
    }

    try {
      // O servidor confirma propriedade e remove a categoria em cascata no banco.
      await deleteCategory(categoryId);
    } catch (error) {
      // Restaura categoria e lançamentos sem duplicar registros já presentes.
      setCategories((current) =>
        current.some((category) => category.id === categoryId)
          ? current
          : [previousCategory, ...current],
      );
      setTransactions((current) => {
        const restored = [...current];
        for (const { transaction, index } of removedTransactions) {
          if (!restored.some((item) => item.id === transaction.id)) {
            restored.splice(Math.min(index, restored.length), 0, transaction);
          }
        }
        return restored;
      });
      // Notifica que a exclusão não foi persistida.
      reportActionError("Não foi possível excluir a categoria.", error);
    }
  }

  // Alterna o estado de pagamento local e reverte somente se o servidor falhar.
  async function changeTransactionStatus(transactionId: string): Promise<void> {
    // Obtém a versão atual para construir o rollback da operação.
    const previousTransaction = transactions.find(
      (transaction) => transaction.id === transactionId,
    );
    // Impede chamar o servidor com um identificador que não está visível.
    if (!previousTransaction) {
      setActionError("A transação não está disponível nesta conta.");
      return;
    }
    // Calcula o novo estado e aplica a mudança sem aguardar a rede.
    const optimisticTransaction: Transaction = {
      ...previousTransaction,
      status: previousTransaction.status === "paid" ? "pending" : "paid",
    };
    setActionError("");
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === transactionId ? optimisticTransaction : transaction,
      ),
    );

    try {
      // O servidor inverte a situação depois de confirmar a propriedade.
      const savedTransaction = await toggleTransactionStatus(transactionId);
      // Substitui o estado provisório pela versão confirmada.
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === savedTransaction.id ? savedTransaction : transaction,
        ),
      );
    } catch (error) {
      // Recupera o estado anterior sem alterar transações independentes.
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === previousTransaction.id ? previousTransaction : transaction,
        ),
      );
      // Deixa explícito que o novo estado não foi persistido.
      reportActionError("Não foi possível alterar a situação da transação.", error);
    }
  }

  // Filtra as movimentações por mês, categoria e texto de busca.
  const filteredTransactions = useMemo(() => {
    // Normaliza texto para que a busca ignore diferenças de maiúsculas.
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    // Combina os filtros e ordena primeiro as datas mais recentes.
    return transactions
      .filter(
        (transaction) => showAllMonths || transaction.date.startsWith(selectedMonth),
      )
      .filter(
        (transaction) => categoryFilter === "all" || transaction.categoryId === categoryFilter,
      )
      .filter((transaction) => {
        // Mantém todos os registros quando não há texto informado.
        if (!normalizedSearch) {
          return true;
        }
        // Inclui o nome da categoria na busca além da descrição.
        const categoryName =
          categories.find((category) => category.id === transaction.categoryId)?.name ?? "";
        // Compara descrição e categoria com a localização em português.
        return `${transaction.description} ${categoryName}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch);
      })
      .sort((first, second) => second.date.localeCompare(first.date));
  }, [categories, categoryFilter, searchTerm, selectedMonth, showAllMonths, transactions]);

  // Isola as transações do mês selecionado para o Dashboard.
  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(selectedMonth)),
    [selectedMonth, transactions],
  );

  // Soma receitas efetivamente recebidas no mês, sem incluir previsões pendentes.
  const totalIncome = useMemo(
    () =>
      monthlyTransactions.reduce(
        (total, transaction) =>
          transaction.type === "income" && transaction.status === "paid"
            ? total + transaction.amount
            : total,
        0,
      ),
    [monthlyTransactions],
  );

  // Soma despesas do mês sem modificar a lista original.
  const totalExpenses = useMemo(
    () =>
      monthlyTransactions.reduce(
        (total, transaction) =>
          transaction.type === "expense" ? total + transaction.amount : total,
        0,
      ),
    [monthlyTransactions],
  );

  // Calcula o saldo líquido do período consultado.
  const currentBalance = totalIncome - totalExpenses;

  // Agrupa despesas por categoria para desenhar o uso dos limites mensais.
  const categorySpending = useMemo<CategorySpending[]>(() => {
    // Identifica categorias que tiveram alguma despesa no mês selecionado.
    const categoriesWithExpenses = new Set(
      monthlyTransactions
        .filter((transaction) => transaction.type === "expense")
        .map((transaction) => transaction.categoryId),
    );

    // Mostra categorias com limite ou que receberam uma despesa no período.
    return categories
      .filter(
        (category) => category.budgetLimit > 0 || categoriesWithExpenses.has(category.id),
      )
      .map((category) => ({
        category,
        // Soma somente despesas associadas à categoria atual.
        spent: monthlyTransactions.reduce(
          (total, transaction) =>
            transaction.type === "expense" && transaction.categoryId === category.id
              ? total + transaction.amount
              : total,
          0,
        ),
      }));
  }, [categories, monthlyTransactions]);

  // Expõe dados, filtros, carregamento e ações para os componentes de tela.
  return {
    categories,
    transactions,
    profile,
    hasCompletedOnboarding,
    shouldShowOnboarding,
    selectedMonth,
    setSelectedMonth,
    showAllMonths,
    setShowAllMonths,
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
    isLoading,
    actionError,
    addTransaction,
    editTransaction,
    removeTransaction,
    addCategory,
    editCategory,
    removeCategory,
    toggleTransactionStatus: changeTransactionStatus,
    saveFinancialProfile,
    finishOnboarding,
    saveGuidedSetup,
  };
}
