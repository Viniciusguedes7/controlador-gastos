"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { isSalaryCategoryName } from "../lib/category-utils";
import type {
  Category,
  PaymentMethod,
  Transaction,
  TransactionType,
} from "../types/finance";
import CustomSelect, { type CustomSelectOption } from "./CustomSelect";

interface QuickTransactionModalProps {
  categories: Category[];
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, "id">) => Promise<void>;
}

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15";

function getLocalToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
}

export default function QuickTransactionModal({
  categories,
  onClose,
  onAdd,
}: QuickTransactionModalProps) {
  const defaultCategory =
    categories.find((category) => !isSalaryCategoryName(category.name)) ??
    categories[0];
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategory?.id ?? "");
  const [type, setType] = useState<TransactionType>(
    defaultCategory && isSalaryCategoryName(defaultCategory.name)
      ? "income"
      : "expense",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debit");
  const [error, setError] = useState("");
  const [salaryConfirmationPending, setSalaryConfirmationPending] = useState(false);
  const [salaryExpenseConfirmed, setSalaryExpenseConfirmed] = useState(false);

  const categoryOptions: CustomSelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));
  const typeOptions: CustomSelectOption[] = [
    { value: "expense", label: "Despesa", color: "#fb7185" },
    { value: "income", label: "Receita", color: "#34d399" },
  ];
  const paymentOptions: CustomSelectOption[] = [
    { value: "credit", label: "Crédito", color: "#a78bfa" },
    { value: "debit", label: "Débito", color: "#38bdf8" },
    { value: "cash", label: "Dinheiro", color: "#34d399" },
  ];
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const isSalaryCategory =
    selectedCategory !== undefined &&
    isSalaryCategoryName(selectedCategory.name);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function changeType(nextType: string): void {
    if (nextType === "expense" && isSalaryCategory) {
      setSalaryConfirmationPending(true);
      setSalaryExpenseConfirmed(false);
      setError(
        "Salário é uma categoria de receita. Confirme se deseja registrá-la como despesa.",
      );
      return;
    }

    setType(nextType as TransactionType);
    setSalaryConfirmationPending(false);
    setSalaryExpenseConfirmed(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(",", "."));
    if (!description.trim()) {
      setError("Informe uma descrição para a transação.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (!selectedCategory) {
      setError("Crie uma categoria antes de registrar uma transação.");
      return;
    }
    if (
      isSalaryCategory &&
      type === "expense" &&
      !salaryExpenseConfirmed
    ) {
      setSalaryConfirmationPending(true);
      setError("Confirme que deseja registrar Salário como despesa.");
      return;
    }

    await onAdd({
      description: description.trim(),
      amount: parsedAmount,
      type,
      categoryId,
      date: getLocalToday(),
      status: "paid",
      isRecurring: false,
      paymentMethod,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        aria-label="Fechar transação rápida"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-transaction-title"
        className="relative z-10 w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="quick-transaction-title" className="text-lg font-semibold text-zinc-100">
              Transação rápida
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Registre um gasto do dia a dia em poucos passos. Data de hoje e pago por padrão.
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
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-400 sm:col-span-2">
            Descrição
            <input
              autoFocus
              className={fieldClassName}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: Pizza, pastel ou café"
              maxLength={80}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Valor (R$)
            <input
              className={fieldClassName}
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0,00"
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Tipo
            <CustomSelect
              ariaLabel="Tipo da transação rápida"
              value={type}
              options={typeOptions}
              onChange={changeType}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Categoria
            <CustomSelect
              ariaLabel="Categoria da transação rápida"
              value={categoryId}
              options={categoryOptions}
              onChange={(value) => {
                setCategoryId(value);
                const category = categories.find((item) => item.id === value);
                if (category && isSalaryCategoryName(category.name)) {
                  setType("income");
                  setSalaryConfirmationPending(false);
                  setSalaryExpenseConfirmed(false);
                  setError("");
                } else {
                  setSalaryConfirmationPending(false);
                  setSalaryExpenseConfirmed(false);
                }
              }}
              placeholder="Selecione uma categoria"
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Forma de pagamento
            <CustomSelect
              ariaLabel="Forma de pagamento da transação rápida"
              value={paymentMethod}
              options={paymentOptions}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-300 sm:col-span-2">
              {error}
            </p>
          )}
          {salaryConfirmationPending && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-700/60 bg-amber-950/30 p-3 text-sm text-amber-200 sm:col-span-2">
              <span>Confirme que deseja lançar Salário como uma despesa.</span>
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setSalaryConfirmationPending(false);
                  setSalaryExpenseConfirmed(true);
                  setError("");
                }}
                className="rounded-lg border border-amber-500/60 px-3 py-2 font-semibold transition hover:bg-amber-400/10"
              >
                Confirmar despesa
              </button>
            </div>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              <Plus aria-hidden="true" size={16} />
              Salvar transação
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
