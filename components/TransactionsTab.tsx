"use client";

/**
 * Cuida do cadastro, edição, filtros e manutenção dos lançamentos financeiros.
 */

import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type {
  Category,
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../types/finance";
import { isSalaryCategoryName } from "../lib/category-utils";
import CustomSelect, { type CustomSelectOption } from "./CustomSelect";
import CustomDatePicker from "./CustomDatePicker";

/** Campos controlados pelo formulário antes de serem salvos como uma transação. */
interface TransactionFormValues {
  /** Descrição digitada pelo usuário. */
  description: string;
  /** Valor em reais como texto até a validação do envio. */
  amount: string;
  /** Tipo da movimentação selecionado. */
  type: TransactionType;
  /** Categoria escolhida na lista. */
  categoryId: string;
  /** Data selecionada no calendário do formulário. */
  date: string | null;
  /** Situação de pagamento selecionada. */
  status: TransactionStatus;
  /** Opção para identificar uma movimentação recorrente. */
  isRecurring: boolean;
  /** Forma de pagamento selecionada. */
  paymentMethod: PaymentMethod;
}

/** Propriedades para compartilhar os dados e as operações do hook. */
interface TransactionsTabProps {
  /** Movimentações já filtradas pelo mês, busca e categoria. */
  transactions: Transaction[];
  /** Categorias disponíveis para classificar os registros. */
  categories: Category[];
  /** Busca compartilhada, também fornecida pelo hook. */
  searchTerm: string;
  /** Atualiza a busca por descrição ou categoria. */
  onSearchChange: (value: string) => void;
  /** Categoria selecionada no filtro global. */
  categoryFilter: string;
  /** Atualiza o filtro global por categoria. */
  onCategoryFilterChange: (value: string) => void;
  /** Filtros de tipo e situação compartilhados com os atalhos da Dashboard. */
  typeFilter: "all" | TransactionType;
  onTypeFilterChange: (value: "all" | TransactionType) => void;
  statusFilter: "all" | TransactionStatus;
  onStatusFilterChange: (value: "all" | TransactionStatus) => void;
  paymentMethodFilter: "all" | PaymentMethod;
  onPaymentMethodFilterChange: (value: "all" | PaymentMethod) => void;
  showAllMonths: boolean;
  onShowAllMonthsChange: (showAllMonths: boolean) => void;
  /** Período global no formato YYYY-MM. */
  selectedMonth: string;
  /** Cadastra uma transação validada. */
  onAdd: (transaction: Omit<Transaction, "id">) => void;
  /** Atualiza uma transação existente. */
  onEdit: (transaction: Transaction) => void;
  /** Exclui uma transação pelo seu identificador. */
  onRemove: (transactionId: string) => void;
  /** Alterna o estado de pagamento por uma operação protegida no servidor. */
  onToggleStatus: (transactionId: string) => void;
}

/** Classes compartilhadas pelos campos para manter uma aparência consistente. */
const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15";

/** Formata uma quantia em reais com a localidade brasileira. */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Converte uma data ISO para uma exibição curta sem alterar o fuso. */
function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** Tela completa para registrar e revisar receitas e despesas. */
export default function TransactionsTab({
  transactions,
  categories,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  paymentMethodFilter,
  onPaymentMethodFilterChange,
  showAllMonths,
  onShowAllMonthsChange,
  selectedMonth,
  onAdd,
  onEdit,
  onRemove,
  onToggleStatus,
}: TransactionsTabProps) {
  const salaryCategory = categories.find((category) =>
    isSalaryCategoryName(category.name),
  );
  const defaultExpenseCategory =
    categories.find((category) => !isSalaryCategoryName(category.name)) ??
    categories[0];
  /** Guarda o identificador do registro em edição ou null para novo cadastro. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Registra se a categoria foi escolhida manualmente no formulário atual. */
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);
  /** Controla o aviso de validação visível junto ao formulário. */
  const [formError, setFormError] = useState("");
  /** Exige uma confirmação separada antes de salvar Salário como despesa. */
  const [salaryExpenseConfirmationPending, setSalaryExpenseConfirmationPending] = useState(false);
  const [salaryExpenseConfirmed, setSalaryExpenseConfirmed] = useState(false);
  /** Mantém os campos do formulário sincronizados com a digitação. */
  const [formValues, setFormValues] = useState<TransactionFormValues>(() => ({
    description: "",
    amount: "",
    type:
      defaultExpenseCategory &&
      isSalaryCategoryName(defaultExpenseCategory.name)
        ? "income"
        : "expense",
    categoryId: defaultExpenseCategory?.id ?? "",
    date: null,
    status: "paid",
    isRecurring: false,
    paymentMethod: "debit",
  }));

  /** Pré-preenche apenas novos lançamentos ainda sem data selecionada. */
  const effectiveDate = editingId
    ? formValues.date ?? ""
    : formValues.date ?? (selectedMonth ? `${selectedMonth}-01` : "");
  /** Evita enviar uma categoria antiga que não existe mais na lista atual. */
  const fallbackCategoryId =
    formValues.type === "income"
      ? salaryCategory?.id ?? categories[0]?.id ?? ""
      : defaultExpenseCategory?.id ?? "";
  const effectiveCategoryId = categories.some(
    (category) => category.id === formValues.categoryId,
  )
    ? formValues.categoryId
    : fallbackCategoryId;

  /** Atualiza apenas um campo, preservando os demais valores preenchidos. */
  function updateFormValue<Key extends keyof TransactionFormValues>(
    key: Key,
    value: TransactionFormValues[Key],
  ): void {
    setFormValues((currentValues) => ({ ...currentValues, [key]: value }));
  }

  /** Limpa a edição atual e prepara um formulário para a próxima inclusão. */
  function resetForm(): void {
    setEditingId(null);
    setFormError("");
    setFormValues({
      description: "",
      amount: "",
      type:
        defaultExpenseCategory &&
        isSalaryCategoryName(defaultExpenseCategory.name)
          ? "income"
          : "expense",
      categoryId: defaultExpenseCategory?.id ?? "",
      date: null,
      status: "paid",
      isRecurring: false,
      paymentMethod: "debit",
    });
    setHasManuallySelectedCategory(false);
    setSalaryExpenseConfirmationPending(false);
    setSalaryExpenseConfirmed(false);
  }

  /** Prefere Salário ao alternar para receita, salvo escolha manual anterior. */
  function changeTransactionType(type: TransactionType): void {
    const selectedCategory = categories.find(
      (category) => category.id === effectiveCategoryId,
    );
    if (
      type === "expense" &&
      selectedCategory &&
      isSalaryCategoryName(selectedCategory.name)
    ) {
      setSalaryExpenseConfirmationPending(true);
      setSalaryExpenseConfirmed(false);
      setFormError(
        "A categoria Salário normalmente representa uma entrada. Confirme explicitamente se deseja registrá-la como despesa.",
      );
      return;
    }

    updateFormValue("type", type);
    setSalaryExpenseConfirmationPending(false);
    setSalaryExpenseConfirmed(false);
    if (!hasManuallySelectedCategory) {
      updateFormValue(
        "categoryId",
        type === "income"
          ? salaryCategory?.id ?? categories[0]?.id ?? ""
          : defaultExpenseCategory?.id ?? "",
      );
    }
  }

  /** Carrega os campos do lançamento selecionado no formulário. */
  function startEditing(transaction: Transaction): void {
    setEditingId(transaction.id);
    setHasManuallySelectedCategory(true);
    setFormError("");
    setFormValues({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      categoryId: transaction.categoryId,
      date: transaction.date,
      status: transaction.status,
      isRecurring: transaction.isRecurring,
      paymentMethod: transaction.paymentMethod,
    });
    setSalaryExpenseConfirmationPending(false);
    setSalaryExpenseConfirmed(false);
    document.getElementById("transaction-form")?.scrollIntoView({ behavior: "smooth" });
  }

  /** Valida os campos e envia a transação para a função recebida da página. */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedAmount = Number(formValues.amount.replace(",", "."));

    if (!formValues.description.trim()) {
      setFormError("Informe uma descrição para a transação.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }

    if (!categories.some((category) => category.id === effectiveCategoryId)) {
      setFormError("Crie uma categoria antes de registrar uma transação.");
      return;
    }

    const selectedCategory = categories.find(
      (category) => category.id === effectiveCategoryId,
    );
    if (
      selectedCategory &&
      isSalaryCategoryName(selectedCategory.name) &&
      formValues.type === "expense" &&
      !salaryExpenseConfirmed
    ) {
      setFormError("Confirme que deseja salvar a categoria Salário como despesa.");
      setSalaryExpenseConfirmationPending(true);
      return;
    }

    if (!effectiveDate) {
      setFormError("Selecione uma data para a transação.");
      return;
    }

    const transactionData = {
      description: formValues.description.trim(),
      amount: parsedAmount,
      type: formValues.type,
      categoryId: effectiveCategoryId,
      date: effectiveDate,
      status: formValues.status,
      isRecurring: formValues.isRecurring,
      paymentMethod: formValues.paymentMethod,
    };

    if (editingId) {
      onEdit({ ...transactionData, id: editingId });
    } else {
      onAdd(transactionData);
    }

    resetForm();
  }

  /** Solicita confirmação antes de remover permanentemente um lançamento. */
  function handleRemove(transaction: Transaction): void {
    const shouldRemove = window.confirm(
      `Deseja excluir a transação "${transaction.description}"?`,
    );

    if (shouldRemove) {
      onRemove(transaction.id);
      if (editingId === transaction.id) {
        resetForm();
      }
    }
  }

  /** Combina os filtros específicos desta tela com a lista já filtrada pelo hook. */
  const visibleTransactions = transactions.filter(
    (transaction) =>
      (typeFilter === "all" || transaction.type === typeFilter) &&
      (statusFilter === "all" || transaction.status === statusFilter) &&
      (paymentMethodFilter === "all" ||
        transaction.paymentMethod === paymentMethodFilter),
  );
  const categoryOptions: CustomSelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));
  const categoryFilterOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas as categorias" },
    ...categoryOptions,
  ];
  const transactionTypeOptions: CustomSelectOption[] = [
    {
      value: "expense",
      label: "Despesa",
      color: "#fb7185",
      subtitle: "Dinheiro que sai",
    },
    {
      value: "income",
      label: "Receita",
      color: "#34d399",
      subtitle: "Dinheiro que entra",
    },
  ];
  const paymentOptions: CustomSelectOption[] = [
    {
      value: "paid",
      label: "Pago",
      color: "#34d399",
      subtitle: "Já foi recebido ou quitado",
    },
    {
      value: "pending",
      label: "Pendente",
      color: "#fbbf24",
      subtitle: "Ainda está previsto",
    },
  ];
  const periodOptions: CustomSelectOption[] = [
    { value: "selected", label: "Mês selecionado" },
    { value: "all", label: "Todos os meses" },
  ];
  const typeFilterOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos os tipos" },
    {
      value: "income",
      label: "Receitas",
      color: "#34d399",
    },
    {
      value: "expense",
      label: "Despesas",
      color: "#fb7185",
    },
  ];
  const statusFilterOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas as situações" },
    { value: "paid", label: "Pagas", color: "#34d399" },
    { value: "pending", label: "Pendentes", color: "#fbbf24" },
  ];
  const paymentMethodOptions: CustomSelectOption[] = [
    { value: "credit", label: "Crédito", color: "#a78bfa" },
    { value: "debit", label: "Débito", color: "#38bdf8" },
    { value: "cash", label: "Dinheiro", color: "#34d399" },
  ];
  const paymentMethodFilterOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas as formas" },
    ...paymentMethodOptions,
  ];
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    credit: "Crédito",
    debit: "Débito",
    cash: "Dinheiro",
  };
  const paymentMethodTotals = paymentMethodOptions.map((option) => {
    const method = option.value as PaymentMethod;
    const methodTransactions = visibleTransactions.filter(
      (transaction) => transaction.paymentMethod === method,
    );
    return {
      ...option,
      count: methodTransactions.length,
      amount: methodTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      ),
    };
  });

  /** Alterna o estado de pagamento de um item sem alterar os demais dados. */
  function toggleStatus(transaction: Transaction): void {
    onToggleStatus(transaction.id);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Transações</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Registre entradas e saídas e acompanhe o que já foi pago.
        </p>
      </div>

      <section
        id="transaction-form"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-100">
              {editingId ? "Editar transação" : "Nova transação"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Preencha os campos para manter seu controle atualizado.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X aria-hidden="true" size={15} />
              Cancelar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-zinc-400 sm:col-span-2">
            Descrição
            <input
              className={fieldClassName}
              type="text"
              value={formValues.description}
              onChange={(event) => updateFormValue("description", event.target.value)}
              placeholder="Ex.: Conta de energia"
              maxLength={80}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Valor (R$)
            <input
              className={fieldClassName}
              type="number"
              value={formValues.amount}
              onChange={(event) => updateFormValue("amount", event.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0,00"
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Tipo
            <CustomSelect
              ariaLabel="Tipo da transação"
              value={formValues.type}
              options={transactionTypeOptions}
              onChange={(value) => changeTransactionType(value as TransactionType)}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Categoria
            <CustomSelect
              ariaLabel="Categoria da transação"
              value={effectiveCategoryId}
              options={categoryOptions}
              onChange={(value) => {
                setHasManuallySelectedCategory(true);
                updateFormValue("categoryId", value);
                const category = categories.find((item) => item.id === value);
                if (category && isSalaryCategoryName(category.name)) {
                  updateFormValue("type", "income");
                  setSalaryExpenseConfirmationPending(false);
                  setSalaryExpenseConfirmed(false);
                  setFormError("");
                } else {
                  setSalaryExpenseConfirmationPending(false);
                  setSalaryExpenseConfirmed(false);
                }
              }}
              placeholder="Selecione uma categoria"
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Data
            <CustomDatePicker
              ariaLabel="Data da transação"
              value={effectiveDate}
              onChange={(value) => updateFormValue("date", value)}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Pagamento
            <CustomSelect
              ariaLabel="Situação de pagamento"
              value={formValues.status}
              options={paymentOptions}
              onChange={(value) => updateFormValue("status", value as TransactionStatus)}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Forma de pagamento
            <CustomSelect
              ariaLabel="Forma de pagamento"
              value={formValues.paymentMethod}
              options={paymentMethodOptions}
              onChange={(value) =>
                updateFormValue("paymentMethod", value as PaymentMethod)
              }
            />
          </label>
          <div className="flex items-end justify-between gap-4 sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2 pb-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={formValues.isRecurring}
                onChange={(event) => updateFormValue("isRecurring", event.target.checked)}
                className="size-4 accent-violet-500"
              />
              Transação recorrente
            </label>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              {editingId ? <Check aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              {editingId ? "Salvar alterações" : "Adicionar transação"}
            </button>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-rose-300 sm:col-span-2 lg:col-span-4">
              {formError}
            </p>
          )}
          {salaryExpenseConfirmationPending && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-700/60 bg-amber-950/30 p-3 text-sm text-amber-200 sm:col-span-2 lg:col-span-4">
              <span>
                Confirme que reconhece que esta movimentação será registrada como uma despesa na categoria Salário.
              </span>
              <button
                type="button"
                onClick={() => {
                  updateFormValue("type", "expense");
                  setSalaryExpenseConfirmationPending(false);
                  setSalaryExpenseConfirmed(true);
                  setFormError("");
                }}
                className="rounded-lg border border-amber-500/60 px-3 py-2 font-semibold transition hover:bg-amber-400/10"
              >
                Confirmar despesa
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <span className="sr-only">Buscar transações</span>
            <input
              className={`${fieldClassName} mt-0 pl-9`}
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar descrição ou categoria..."
            />
          </label>
          <div className="min-w-0 sm:w-44">
            <CustomSelect
              ariaLabel="Filtrar por categoria"
              value={categoryFilter}
              options={categoryFilterOptions}
              onChange={onCategoryFilterChange}
              className="mt-0"
            />
          </div>
          <div className="min-w-0 sm:w-40">
            <CustomSelect
              ariaLabel="Filtrar por período"
              value={showAllMonths ? "all" : "selected"}
              options={periodOptions}
              onChange={(value) => onShowAllMonthsChange(value === "all")}
              className="mt-0"
            />
          </div>
          <div className="min-w-0 sm:w-36">
            <CustomSelect
              ariaLabel="Filtrar por tipo"
              value={typeFilter}
              options={typeFilterOptions}
              onChange={(value) => onTypeFilterChange(value as "all" | TransactionType)}
              className="mt-0"
            />
          </div>
          <div className="min-w-0 sm:w-36">
            <CustomSelect
              ariaLabel="Filtrar por situação"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) =>
                onStatusFilterChange(value as "all" | TransactionStatus)
              }
              className="mt-0"
            />
          </div>
          <div className="min-w-0 sm:w-40">
            <CustomSelect
              ariaLabel="Filtrar por forma de pagamento"
              value={paymentMethodFilter}
              options={paymentMethodFilterOptions}
              onChange={(value) =>
                onPaymentMethodFilterChange(value as "all" | PaymentMethod)
              }
              className="mt-0"
            />
          </div>
        </div>

        <div className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-3">
          {paymentMethodTotals.map(({ value, label, color, count, amount }) => (
            <article
              key={value}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3"
            >
              <p className="text-xs font-medium" style={{ color }}>{label}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {currencyFormatter.format(amount)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {count} {count === 1 ? "transação" : "transações"}
              </p>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Descrição</th>
                <th scope="col" className="px-4 py-3 font-medium">Categoria</th>
                <th scope="col" className="px-4 py-3 font-medium">Data</th>
                <th scope="col" className="px-4 py-3 font-medium">Forma de pagamento</th>
                <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {visibleTransactions.map((transaction) => {
                const category = categories.find(
                  (item) => item.id === transaction.categoryId,
                );
                const isIncome = transaction.type === "income";

                return (
                  <tr key={transaction.id} className="transition hover:bg-zinc-800/30">
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-200">{transaction.description}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {isIncome ? "Receita" : "Despesa"}
                        {transaction.isRecurring ? " · Recorrente" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="category-color-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          color: category?.color ?? "#a1a1aa",
                          backgroundColor: category ? `${category.color}20` : "#27272a",
                        }}
                      >
                        {category && (
                          <span
                            aria-hidden="true"
                            className="category-color-swatch size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category?.name ?? "Sem categoria"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-4 text-zinc-300">
                      {paymentMethodLabels[transaction.paymentMethod]}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          transaction.status === "paid"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {transaction.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-semibold ${
                        isIncome ? "text-emerald-300" : "text-zinc-200"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {currencyFormatter.format(transaction.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {transaction.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => toggleStatus(transaction)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
                          >
                            <Check aria-hidden="true" size={14} />
                            Marcar como pago
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Editar ${transaction.description}`}
                          onClick={() => startEditing(transaction)}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-violet-300"
                        >
                          <Pencil aria-hidden="true" size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${transaction.description}`}
                          onClick={() => handleRemove(transaction)}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-400/10 hover:text-rose-300"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleTransactions.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-zinc-500">
              Nenhuma transação encontrada para os filtros selecionados.
            </p>
          )}
        </div>
        <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">
          {visibleTransactions.length} {visibleTransactions.length === 1 ? "registro" : "registros"} exibidos
        </p>
      </section>
    </section>
  );
}
