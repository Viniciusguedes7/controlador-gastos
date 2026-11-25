"use server";

// Importa a sessão segura do NextAuth para autenticar cada operação.
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
// Reutiliza a configuração compartilhada pelo fluxo de autenticação.
import { authOptions } from "../../lib/auth";
// Usa o singleton do banco apenas no servidor.
import { prisma } from "../../lib/prisma";
import {
  isSalaryCategoryName,
  normalizeCategoryName,
} from "../../lib/category-utils";
// Compartilha contratos restritos da interface financeira.
import type {
  Category,
  FinanceData,
  FinancialProfile,
  GuidedSetupInput,
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../../types/finance";

// Tipifica os dados públicos de uma transação, sem permitir envio de userId pelo cliente.
type TransactionInput = Omit<Transaction, "id">;
// Tipifica os dados públicos de uma categoria sem seu identificador gerado pelo banco.
type CategoryInput = Omit<Category, "id">;
type FinanceTransactionClient = Prisma.TransactionClient;

// Lê a sessão em todas as operações e interrompe chamadas sem usuário autenticado.
async function requireUserId(): Promise<string> {
  // Consulta os cookies seguros mantidos pelo NextAuth.
  const session = await getServerSession(authOptions);
  // Exige um usuário e um identificador antes de tocar nos registros financeiros.
  if (!session?.user?.id) {
    throw new Error("É necessário entrar na conta para acessar os dados financeiros.");
  }

  // Retorna o identificador confiável vindo da sessão, nunca do formulário.
  return session.user.id;
}

// Garante uma única categoria padrão mesmo quando duas cargas ocorrem juntas.
async function ensureSalaryCategory(
  database: FinanceTransactionClient,
  userId: string,
): Promise<void> {
  await database.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
  `;

  const salaryCategory = await database.category.findFirst({
    where: {
      userId,
      name: { equals: "Salário", mode: "insensitive" },
    },
    select: { id: true },
  });
  if (salaryCategory) {
    return;
  }

  await database.category.create({
    data: {
      userId,
      name: "Salário",
      color: "#10b981",
      budgetLimit: 0,
      isSystemDefault: true,
    },
  });
}

// Converte registros do banco sem confiar em strings inválidas salvas em type/status.
function mapTransaction(record: {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  status: string;
  isRecurring: boolean;
  categoryId: string;
  paymentMethod: string;
}): Transaction {
  // Recusa valores fora dos contratos conhecidos pela interface e pelos cálculos.
  if (
    (record.type !== "income" && record.type !== "expense") ||
    (record.status !== "paid" && record.status !== "pending") ||
    (record.paymentMethod !== "credit" &&
      record.paymentMethod !== "debit" &&
      record.paymentMethod !== "cash")
  ) {
    throw new Error("Uma transação armazenada contém tipo ou situação inválidos.");
  }

  // Retorna somente os campos públicos e já validados do lançamento.
  return {
    id: record.id,
    description: record.description,
    amount: record.amount,
    type: record.type as TransactionType,
    date: record.date,
    status: record.status as TransactionStatus,
    isRecurring: record.isRecurring,
    categoryId: record.categoryId,
    paymentMethod: record.paymentMethod as PaymentMethod,
  };
}

// Confere todos os campos enviados antes de gravar uma transação.
function validateTransaction(input: TransactionInput): void {
  // Recusa payloads que não tenham sido enviados como objeto estruturado.
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados da transação estão incompletos.");
  }

  // Garante que a descrição seja útil e respeite o limite do formulário.
  if (typeof input.description !== "string" || !input.description.trim() || input.description.length > 80) {
    throw new Error("Informe uma descrição válida de até 80 caracteres.");
  }

  // Impede valores negativos, zero, NaN e valores infinitos.
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("O valor da transação deve ser maior que zero.");
  }

  // Aceita somente as opções que o formulário apresenta.
  if (input.type !== "income" && input.type !== "expense") {
    throw new Error("Selecione um tipo de transação válido.");
  }

  // Confere o formato da data antes de armazená-la como texto ISO.
  if (!isValidISODate(input.date)) {
    throw new Error("Selecione uma data válida para a transação.");
  }

  // Evita gravar situações não reconhecidas pelos filtros e indicadores.
  if (input.status !== "paid" && input.status !== "pending") {
    throw new Error("Selecione uma situação de pagamento válida.");
  }

  if (
    input.paymentMethod !== "credit" &&
    input.paymentMethod !== "debit" &&
    input.paymentMethod !== "cash"
  ) {
    throw new Error("Selecione uma forma de pagamento válida.");
  }

  // Confere que a recorrência seja explicitamente booleana.
  if (typeof input.isRecurring !== "boolean") {
    throw new Error("A opção de recorrência é inválida.");
  }

  // Evita consultar ou gravar categorias com identificador vazio.
  if (typeof input.categoryId !== "string" || !input.categoryId) {
    throw new Error("Selecione uma categoria válida.");
  }
}

// Valida datas civis sem convertê-las para o fuso horário do servidor.
function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}

// Valida identificadores de registros antes de enviá-los ao Prisma.
function validateRecordId(id: string, recordName: string): void {
  // Evita consultas com valores vazios ou que não sejam texto.
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(`O identificador de ${recordName} é inválido.`);
  }
}

// Confere os campos da categoria sem aceitar valores controlados pelo cliente como dono.
function validateCategory(input: CategoryInput): void {
  // Recusa payloads que não tenham sido enviados como objeto estruturado.
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados da categoria estão incompletos.");
  }

  // Limita o nome para manter consistência com o campo de cadastro.
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 40) {
    throw new Error("Informe um nome válido de até 40 caracteres para a categoria.");
  }

  // Exige uma cor hexadecimal que possa ser exibida com segurança.
  if (!/^#[\da-fA-F]{6}$/.test(input.color)) {
    throw new Error("Selecione uma cor hexadecimal válida.");
  }

  // Aceita apenas limites finitos e não negativos.
  if (!Number.isFinite(input.budgetLimit) || input.budgetLimit < 0) {
    throw new Error("O limite da categoria deve ser maior ou igual a zero.");
  }
}

// Valida os campos de orçamento aceitos tanto no perfil quanto no onboarding.
function validateFinancialProfile(input: FinancialProfile): void {
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados do perfil estão incompletos.");
  }

  for (const [label, value] of [
    ["salário mensal", input.monthlySalary],
    ["limite mensal", input.monthlySpendingLimit],
  ] as const) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Informe um valor válido e não negativo para ${label}.`);
    }
  }
}

// Busca dados financeiros sempre limitados ao usuário identificado pela sessão.
export async function getFinanceData(localToday: string): Promise<FinanceData> {
  // Obtém a identidade validada antes de fazer qualquer consulta.
  const userId = await requireUserId();
  if (!isValidISODate(localToday)) {
    throw new Error("A data local enviada para carregar as transações é inválida.");
  }

  return prisma.$transaction(async (database) => {
    // Marca receitas vencidas como recebidas usando o dia local informado pelo navegador.
    await database.transaction.updateMany({
      where: {
        userId,
        type: "income",
        status: "pending",
        date: { lte: localToday },
      },
      data: { status: "paid" },
    });

    // Lê os dados antes de criar a categoria padrão para não confundir conta nova com antiga.
    const [existingCategories, transactionRecords, profileRecord] = await Promise.all([
      database.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          budgetLimit: true,
          isSystemDefault: true,
        },
      }),
      database.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
          date: true,
          status: true,
          isRecurring: true,
          categoryId: true,
          paymentMethod: true,
        },
      }),
      database.user.findUnique({
        where: { id: userId },
        select: {
          monthlySalary: true,
          monthlySpendingLimit: true,
          hasCompletedOnboarding: true,
        },
      }),
    ]);
    if (!profileRecord) {
      throw new Error("Não foi possível localizar o perfil desta conta.");
    }

    const hasExistingData =
      existingCategories.some(
        (category) =>
          !category.isSystemDefault || !isSalaryCategoryName(category.name),
      ) ||
      transactionRecords.length > 0 ||
      profileRecord.monthlySalary !== null ||
      profileRecord.monthlySpendingLimit !== null;
    let hasCompletedOnboarding = profileRecord.hasCompletedOnboarding;

    // Conclui o onboarding automaticamente para contas que já tinham dados salvos.
    if (!hasCompletedOnboarding && hasExistingData) {
      await database.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: true },
      });
      hasCompletedOnboarding = true;
    }

    await ensureSalaryCategory(database, userId);
    const categories = await database.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, budgetLimit: true },
    });

    return {
      categories,
      transactions: transactionRecords.map(mapTransaction),
      profile: {
        monthlySalary: profileRecord.monthlySalary,
        monthlySpendingLimit: profileRecord.monthlySpendingLimit,
      },
      hasCompletedOnboarding,
      shouldShowOnboarding: !hasCompletedOnboarding && !hasExistingData,
    };
  });
}

// Atualiza somente preferências financeiras da pessoa autenticada.
export async function updateFinancialProfile(
  input: FinancialProfile,
): Promise<FinancialProfile> {
  // Usa a identidade da sessão como limite de propriedade.
  const userId = await requireUserId();
  validateFinancialProfile(input);

  // Grava somente os campos permitidos no registro do usuário autenticado.
  return prisma.user.update({
    where: { id: userId },
    data: {
      monthlySalary: input.monthlySalary,
      monthlySpendingLimit: input.monthlySpendingLimit,
    },
    select: { monthlySalary: true, monthlySpendingLimit: true },
  });
}

// Atualiza o assistente guiado sem remover categorias ou transações existentes.
export async function saveGuidedSetup(
  input: GuidedSetupInput,
): Promise<Pick<FinanceData, "categories" | "profile" | "hasCompletedOnboarding">> {
  const userId = await requireUserId();
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados da configuração guiada estão incompletos.");
  }
  validateFinancialProfile(input.profile);
  if (!Array.isArray(input.categories)) {
    throw new Error("A lista de categorias da configuração guiada é inválida.");
  }

  const submittedIds = new Set<string>();
  for (const category of input.categories) {
    validateCategory(category);
    if (category.id !== undefined) {
      if (typeof category.id !== "string" || !category.id.trim()) {
        throw new Error("O identificador de uma categoria é inválido.");
      }
      if (submittedIds.has(category.id)) {
        throw new Error("Uma categoria foi enviada mais de uma vez.");
      }
      submittedIds.add(category.id);
    }
  }

  return prisma.$transaction(async (database) => {
    const user = await database.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new Error("Não foi possível localizar o perfil desta conta.");
    }

    await ensureSalaryCategory(database, userId);
    const existingCategories = await database.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const categoriesById = new Map(
      existingCategories.map((category) => [category.id, category]),
    );
    const existingIdsInInput = new Set(
      input.categories.flatMap((category) => (category.id ? [category.id] : [])),
    );

    for (const category of input.categories) {
      if (!category.id) {
        continue;
      }
      const currentCategory = categoriesById.get(category.id);
      if (!currentCategory) {
        throw new Error("Uma categoria selecionada não pertence a esta conta.");
      }
      if (
        isSalaryCategoryName(currentCategory.name) &&
        !isSalaryCategoryName(category.name)
      ) {
        throw new Error("O nome da categoria padrão Salário não pode ser alterado.");
      }
    }

    const usedNames = new Set(
      existingCategories
        .filter((category) => !existingIdsInInput.has(category.id))
        .map((category) => normalizeCategoryName(category.name)),
    );
    for (const category of input.categories) {
      const normalizedName = normalizeCategoryName(category.name);
      if (usedNames.has(normalizedName)) {
        throw new Error(`Já existe uma categoria chamada "${category.name.trim()}".`);
      }
      usedNames.add(normalizedName);
    }

    for (const category of input.categories) {
      const data = {
        name: category.name.trim(),
        color: category.color,
        budgetLimit: category.budgetLimit,
      };

      if (category.id) {
        await database.category.update({
          where: { id: category.id },
          data,
        });
      } else {
        await database.category.create({
          data: { ...data, userId },
        });
      }
    }

    const [categories, profile] = await Promise.all([
      database.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, budgetLimit: true },
      }),
      database.user.update({
        where: { id: userId },
        data: {
          monthlySalary: input.profile.monthlySalary,
          monthlySpendingLimit: input.profile.monthlySpendingLimit,
          hasCompletedOnboarding: true,
        },
        select: { monthlySalary: true, monthlySpendingLimit: true },
      }),
    ]);

    return {
      categories,
      profile,
      hasCompletedOnboarding: true,
    };
  });
}

// Cria uma transação somente depois de validar a categoria no escopo do usuário.
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  // Exige uma sessão válida para impedir inserções anônimas.
  const userId = await requireUserId();
  // Valida novamente os dados no servidor, mesmo que o formulário já os valide.
  validateTransaction(input);
  // Confirma que a categoria selecionada pertence à mesma conta.
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { id: true },
  });
  // Impede relacionar uma transação com categoria de outro usuário.
  if (!category) {
    throw new Error("A categoria selecionada não existe nesta conta.");
  }

  // Cria o lançamento com userId obtido da sessão, nunca do cliente.
  const record = await prisma.transaction.create({
    data: { ...input, description: input.description.trim(), userId },
  });

  // Valida os campos de enumeração antes de devolver o registro à interface.
  return mapTransaction(record);
}

// Edita somente uma transação cuja propriedade seja confirmada no próprio banco.
export async function updateTransaction(input: Transaction): Promise<Transaction> {
  // Identifica o proprietário pela sessão autenticada.
  const userId = await requireUserId();
  // Valida tanto campos editáveis quanto o ID exigido para localizar o item.
  validateTransaction(input);
  if (typeof input.id !== "string" || !input.id) {
    throw new Error("A transação selecionada não possui identificador válido.");
  }

  // Verifica que a nova categoria e a transação pertencem ao usuário atual.
  const [transaction, category] = await Promise.all([
    prisma.transaction.findFirst({ where: { id: input.id, userId }, select: { id: true } }),
    prisma.category.findFirst({ where: { id: input.categoryId, userId }, select: { id: true } }),
  ]);
  // Não informa nem altera registros pertencentes a outras contas.
  if (!transaction || !category) {
    throw new Error("A transação ou categoria não pertence a esta conta.");
  }

  // Atualiza somente campos de negócio; o identificador e o dono vêm da consulta.
  const record = await prisma.transaction.update({
    where: { id: input.id },
    data: {
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      date: input.date,
      status: input.status,
      isRecurring: input.isRecurring,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
    },
  });

  // Devolve os valores persistidos em formato tipado à interface otimista.
  return mapTransaction(record);
}

// Exclui uma transação apenas depois de confirmar a propriedade da linha.
export async function deleteTransaction(transactionId: string): Promise<void> {
  // Lê a identidade segura que delimita a operação.
  const userId = await requireUserId();
  // Confere o formato do ID antes de consultar o banco.
  validateRecordId(transactionId, "transação");
  // Confere a existência dentro do conjunto de registros do usuário.
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: { id: true },
  });
  // Rejeita IDs inexistentes e tentativas de exclusão entre contas.
  if (!transaction) {
    throw new Error("A transação não existe nesta conta.");
  }

  // Executa a exclusão por ID somente após validar o escopo do proprietário.
  await prisma.transaction.delete({ where: { id: transaction.id } });
}

// Alterna o estado de pagamento de uma transação pertencente ao usuário atual.
export async function toggleTransactionStatus(transactionId: string): Promise<Transaction> {
  // Obtém o usuário autenticado antes de encontrar o registro.
  const userId = await requireUserId();
  // Confere o formato do ID antes de consultar o banco.
  validateRecordId(transactionId, "transação");
  // Busca apenas uma transação pertencente à conta da sessão atual.
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  // Recusa IDs de outra pessoa ou que já tenham sido excluídos.
  if (!transaction) {
    throw new Error("A transação não existe nesta conta.");
  }
  // Confere a situação antes de inverter o estado persistido.
  if (transaction.status !== "paid" && transaction.status !== "pending") {
    throw new Error("A transação armazenada possui uma situação inválida.");
  }

  // Persiste o novo estado sem aceitar uma situação arbitrária do navegador.
  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: transaction.status === "paid" ? "pending" : "paid" },
  });

  // Converte o resultado validado para o contrato público da tela.
  return mapTransaction(updated);
}

// Cria uma categoria para o usuário da sessão sem aceitar userId externo.
export async function createCategory(input: CategoryInput): Promise<Category> {
  // Garante que o chamador esteja autenticado.
  const userId = await requireUserId();
  // Repete as validações no servidor para proteger chamadas diretas.
  validateCategory(input);
  return prisma.$transaction(async (database) => {
    await ensureSalaryCategory(database, userId);
    const duplicate = await database.category.findFirst({
      where: {
        userId,
        name: { equals: input.name.trim(), mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error(`Já existe uma categoria chamada "${input.name.trim()}".`);
    }

    // Grava a categoria com o proprietário extraído da sessão confiável.
    return database.category.create({
      data: { ...input, name: input.name.trim(), userId },
      select: { id: true, name: true, color: true, budgetLimit: true },
    });
  });
}

// Altera uma categoria somente se o identificador pertencer ao usuário atual.
export async function updateCategory(input: Category): Promise<Category> {
  // Usa a identidade da sessão como limite de propriedade.
  const userId = await requireUserId();
  // Valida os campos editáveis da categoria.
  validateCategory(input);
  // Exige um identificador persistido para localizar a categoria.
  if (typeof input.id !== "string" || !input.id) {
    throw new Error("A categoria selecionada não possui identificador válido.");
  }
  return prisma.$transaction(async (database) => {
    await ensureSalaryCategory(database, userId);
    const category = await database.category.findFirst({
      where: { id: input.id, userId },
      select: { id: true, name: true },
    });
    if (!category) {
      throw new Error("A categoria não existe nesta conta.");
    }
    if (
      isSalaryCategoryName(category.name) &&
      !isSalaryCategoryName(input.name)
    ) {
      throw new Error("O nome da categoria padrão Salário não pode ser alterado.");
    }

    const duplicate = await database.category.findFirst({
      where: {
        id: { not: category.id },
        userId,
        name: { equals: input.name.trim(), mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error(`Já existe uma categoria chamada "${input.name.trim()}".`);
    }

    // Mantém a categoria e seus lançamentos vinculados ao atualizar seus dados.
    return database.category.update({
      where: { id: category.id },
      data: {
        name: input.name.trim(),
        color: input.color,
        budgetLimit: input.budgetLimit,
      },
      select: { id: true, name: true, color: true, budgetLimit: true },
    });
  });
}

// Exclui uma categoria própria; o banco remove em cascata os lançamentos ligados.
export async function deleteCategory(categoryId: string): Promise<void> {
  // Autentica a operação antes de acessar o banco.
  const userId = await requireUserId();
  // Confere o formato do ID antes de consultar o banco.
  validateRecordId(categoryId, "categoria");
  // Confirma propriedade pelo par de identificador e usuário.
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, name: true },
  });
  // Evita apagar categorias inexistentes ou de outra conta.
  if (!category) {
    throw new Error("A categoria não existe nesta conta.");
  }
  if (isSalaryCategoryName(category.name)) {
    throw new Error("A categoria padrão Salário não pode ser excluída.");
  }

  // A relação onDelete Cascade remove as transações dessa categoria.
  await prisma.category.delete({ where: { id: category.id } });
}
