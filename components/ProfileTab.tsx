"use client";

/**
 * Apresenta os dados da conta e permite definir preferências financeiras pessoais.
 */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, CircleUserRound, Save, ShieldAlert, Trash2, X } from "lucide-react";
import type { FinancialProfile, Transaction } from "../types/finance";
import NetWorthChart from "./NetWorthChart";

/** Dados básicos fornecidos pela sessão autenticada do NextAuth. */
interface ProfileUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Propriedades da área de perfil e da gravação protegida no servidor. */
interface ProfileTabProps {
  user: ProfileUser;
  profile: FinancialProfile;
  transactions: Transaction[];
  selectedMonth: string;
  onSave: (profile: FinancialProfile) => Promise<void>;
}

/** Formata valores informados em reais. */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Cria iniciais a partir do nome, usando o e-mail como alternativa. */
function getUserInitials(name?: string | null, email?: string | null): string {
  const displayName = name?.trim() || email?.split("@")[0] || "";
  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0]?.[0] ?? "";
  return initials.toLocaleUpperCase("pt-BR");
}

/** Área de dados da conta e de preferências pessoais de orçamento. */
export default function ProfileTab({
  user,
  profile,
  transactions,
  selectedMonth,
  onSave,
}: ProfileTabProps) {
  const [salary, setSalary] = useState(profile.monthlySalary?.toString() ?? "");
  const [spendingLimit, setSpendingLimit] = useState(
    profile.monthlySpendingLimit?.toString() ?? "",
  );
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const parsedSalary = salary.trim() === "" ? null : Number(salary.replace(",", "."));
  const parsedSpendingLimit =
    spendingLimit.trim() === "" ? null : Number(spendingLimit.replace(",", "."));
  const limitExceedsSalary =
    parsedSalary !== null &&
    parsedSpendingLimit !== null &&
    Number.isFinite(parsedSalary) &&
    Number.isFinite(parsedSpendingLimit) &&
    parsedSalary >= 0 &&
    parsedSpendingLimit > parsedSalary;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");

    if (
      (parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary < 0)) ||
      (parsedSpendingLimit !== null &&
        (!Number.isFinite(parsedSpendingLimit) || parsedSpendingLimit < 0))
    ) {
      setFormError("Informe valores válidos e iguais ou maiores que zero.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        monthlySalary: parsedSalary,
        monthlySpendingLimit: parsedSpendingLimit,
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível salvar seu perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    if (deleteConfirmation !== "CONFIRMAR" || isDeleting) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível excluir sua conta.");
      }

      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir sua conta. Tente novamente.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Seus dados da conta e suas preferências pessoais de orçamento.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {user.image && !avatarLoadFailed ? (
            <Image
              src={user.image}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-14 rounded-full object-cover"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <span
              role="img"
              aria-label={`Avatar de ${user.name || user.email || "usuário"}`}
              className="flex size-14 items-center justify-center rounded-full bg-violet-500/15 text-base font-semibold text-violet-300 ring-1 ring-violet-400/30"
            >
              {getUserInitials(user.name, user.email) || (
                <CircleUserRound aria-hidden="true" size={28} />
              )}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-zinc-100">
              {user.name || "Nome não informado"}
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {user.email || "E-mail não informado"}
            </p>
          </div>
        </div>
      </section>

      <NetWorthChart transactions={transactions} selectedMonth={selectedMonth} />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-zinc-100">Planejamento pessoal</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Esses valores são privados da sua conta e podem ser alterados a qualquer momento.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-400">
            Salário mensal (R$)
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-100 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
              placeholder="Não informado"
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Limite mensal que deseja gastar (R$)
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-100 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={spendingLimit}
              onChange={(event) => setSpendingLimit(event.target.value)}
              placeholder="Não informado"
            />
          </label>
          {limitExceedsSalary && (
            <p
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-300 sm:col-span-2"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              O limite de gastos está acima do salário mensal informado. Você ainda pode salvar esse valor.
            </p>
          )}
          {formError && (
            <p role="alert" className="text-sm text-rose-300 sm:col-span-2">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="text-xs text-zinc-500">
              Salário: {profile.monthlySalary === null
                ? "não informado"
                : currencyFormatter.format(profile.monthlySalary)}
              {" · "}
              Limite: {profile.monthlySpendingLimit === null
                ? "não informado"
                : currencyFormatter.format(profile.monthlySpendingLimit)}
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60"
            >
              <Save aria-hidden="true" size={16} />
              {isSaving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-rose-900/50 bg-rose-950/15 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <h2 className="font-semibold text-rose-200">Zona de Perigo</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
                Excluir a conta remove permanentemente todos os dados financeiros associados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmation("");
              setDeleteError("");
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Trash2 aria-hidden="true" size={16} />
            Excluir minha conta
          </button>
        </div>
      </section>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-rose-900/70 bg-zinc-900 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle aria-hidden="true" size={19} />
                </span>
                <div>
                  <h2 id="delete-account-title" className="text-lg font-semibold text-zinc-100">
                    Excluir conta permanentemente?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Todas as suas transações, categorias, configurações e dados da conta serão
                    apagados permanentemente e não poderão ser recuperados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar confirmação"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <label className="mt-5 block text-sm text-zinc-300">
              Digite <strong className="font-bold text-rose-300">CONFIRMAR</strong> para habilitar a exclusão
              <input
                type="text"
                autoComplete="off"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-100 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </label>

            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-rose-300">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="min-h-11 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== "CONFIRMAR" || isDeleting}
                onClick={() => void handleDeleteAccount()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 aria-hidden="true" size={16} />
                {isDeleting ? "Excluindo..." : "Excluir conta permanentemente"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
