"use client";

/** Configuração inicial em etapas para contas sem dados financeiros anteriores. */

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { CATEGORY_COLOR_OPTIONS } from "../lib/category-colors";
import { isSalaryCategoryName } from "../lib/category-utils";
import type {
  Category,
  FinancialProfile,
  GuidedSetupInput,
} from "../types/finance";
import CustomSelect from "./CustomSelect";

interface OnboardingWizardProps {
  mode?: "initial" | "review";
  initialProfile?: FinancialProfile;
  initialCategories?: Category[];
  onComplete: (input: GuidedSetupInput) => Promise<void>;
  onClose?: () => void;
}

interface CategoryDraft {
  draftId: number;
  categoryId?: string;
  name: string;
  color: string;
  budgetLimit: string;
}

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-100 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15";

/** Apresenta boas-vindas, orçamento base e categorias em modo inicial ou revisão. */
export default function OnboardingWizard({
  mode = "initial",
  initialProfile,
  initialCategories = [],
  onComplete,
  onClose,
}: OnboardingWizardProps) {
  const isReviewMode = mode === "review";
  const [step, setStep] = useState(1);
  const [salary, setSalary] = useState(
    initialProfile?.monthlySalary?.toString() ?? "",
  );
  const [spendingLimit, setSpendingLimit] = useState(
    initialProfile?.monthlySpendingLimit?.toString() ?? "",
  );
  const nextId = useRef(initialCategories.length);
  const [categories, setCategories] = useState<CategoryDraft[]>(() => {
    const savedCategories = initialCategories.map((category, index) => ({
      draftId: index,
      categoryId: category.id,
      name: category.name,
      color: category.color,
      budgetLimit: category.budgetLimit > 0 ? String(category.budgetLimit) : "",
    }));

    return savedCategories.length > 0
      ? savedCategories
      : [
          {
            draftId: 0,
            name: "",
            color: CATEGORY_COLOR_OPTIONS[0].value,
            budgetLimit: "",
          },
        ];
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  function updateCategory(
    id: number,
    field: keyof Pick<CategoryDraft, "name" | "color" | "budgetLimit">,
    value: string,
  ): void {
    setCategories((current) =>
      current.map((category) =>
        category.draftId === id ? { ...category, [field]: value } : category,
      ),
    );
  }

  function validateBudget(): boolean {
    const hasInvalidSalary =
      parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary < 0);
    const hasInvalidLimit =
      parsedSpendingLimit !== null &&
      (!Number.isFinite(parsedSpendingLimit) || parsedSpendingLimit < 0);
    if (
      hasInvalidSalary ||
      hasInvalidLimit ||
      (!isReviewMode && (parsedSalary === null || parsedSpendingLimit === null))
    ) {
      setFormError("Informe um salário e um limite mensal válidos, iguais ou maiores que zero.");
      return false;
    }

    return true;
  }

  function validateCategories(): GuidedSetupInput["categories"] | null {
    const categoryInputs: GuidedSetupInput["categories"] = [];
    for (const category of categories) {
      const name = category.name.trim();
      const rawLimit = category.budgetLimit.trim();
      if (!name && !rawLimit) {
        if (category.categoryId) {
          setFormError("Informe um nome para cada categoria existente.");
          return null;
        }
        continue;
      }
      if (!name) {
        setFormError("Informe um nome para cada categoria preenchida.");
        return null;
      }

      const budgetLimit = rawLimit === "" ? 0 : Number(rawLimit.replace(",", "."));
      if (!Number.isFinite(budgetLimit) || budgetLimit < 0) {
        setFormError(`Informe um limite válido para a categoria "${name}".`);
        return null;
      }

      categoryInputs.push({
        ...(category.categoryId ? { id: category.categoryId } : {}),
        name,
        color: category.color,
        budgetLimit,
      });
    }

    if (!isReviewMode && categoryInputs.length === 0) {
      setFormError("Crie pelo menos uma categoria para concluir a configuração.");
      return null;
    }

    return categoryInputs;
  }

  function advanceFromBudget(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError("");
    if (validateBudget()) {
      setStep(3);
    }
  }

  async function saveSetup(): Promise<boolean> {
    setFormError("");
    if (!validateBudget()) {
      return false;
    }
    const categoryInputs = validateCategories();
    if (!categoryInputs) {
      return false;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        profile: {
          monthlySalary: parsedSalary,
          monthlySpendingLimit: parsedSpendingLimit,
        },
        categories: categoryInputs,
      });
      return true;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as alterações. Tente novamente.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function finishSetup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (await saveSetup() && isReviewMode) {
      onClose?.();
    }
  }

  async function closeAndSave(): Promise<void> {
    if (!isSubmitting && await saveSetup()) {
      onClose?.();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:my-10 sm:p-8"
      >
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              {isReviewMode ? "Revisão guiada" : "Configuração inicial"} · Etapa {step} de 3
            </p>
            {isReviewMode && (
              <button
                type="button"
                aria-label="Salvar e fechar tutorial"
                disabled={isSubmitting}
                onClick={() => void closeAndSave()}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              >
                <X aria-hidden="true" size={18} />
              </button>
            )}
          </div>
          <div className="mt-3 flex gap-2" aria-hidden="true">
            {[1, 2, 3].map((stepNumber) => (
              <span
                key={stepNumber}
                className={`h-1.5 flex-1 rounded-full ${
                  stepNumber <= step ? "bg-violet-400" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h1 id="onboarding-title" className="text-2xl font-semibold text-zinc-100">
              {isReviewMode
                ? "Revise seu planejamento financeiro"
                : "Bem-vindo ao seu Controlador de Gastos"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {isReviewMode
                ? "Confira suas informações e ajuste o orçamento ou as categorias nas próximas etapas. As categorias existentes serão atualizadas sem remover seus lançamentos."
                : "Organize seu dinheiro registrando receitas e despesas, separando o que já foi pago do que ainda está pendente. Defina um limite mensal e acompanhe os gastos por categoria para manter seu planejamento visível."}
            </p>
            {!isReviewMode && (
              <ul className="mt-5 space-y-3 text-sm text-zinc-300">
              <li>• Receitas aumentam o saldo quando recebidas; as pendentes ficam como lembrete.</li>
              <li>• Despesas registram compromissos e podem ser marcadas como pagas.</li>
              <li>• O limite mensal e os limites de categorias ajudam a comparar plano e gasto.</li>
              </ul>
            )}
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                Continuar <ArrowRight aria-hidden="true" size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={advanceFromBudget}>
            <h1 id="onboarding-title" className="text-2xl font-semibold text-zinc-100">
              Planeje seu orçamento mensal
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Informe seus valores base. Eles serão salvos no Perfil ao concluir a configuração.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-zinc-400">
                Salário mensal (R$)
                <input
                  className={fieldClassName}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                  placeholder="Ex.: 5000,00"
                />
              </label>
              <label className="text-xs font-medium text-zinc-400">
                Limite que deseja gastar no mês (R$)
                <input
                  className={fieldClassName}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={spendingLimit}
                  onChange={(event) => setSpendingLimit(event.target.value)}
                  placeholder="Ex.: 3500,00"
                />
              </label>
            </div>
            {limitExceedsSalary && (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-xl border border-amber-500/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300"
              >
                O limite mensal está acima do salário informado. Você ainda pode continuar e
                salvar esse planejamento.
              </p>
            )}
            {formError && (
              <p role="alert" className="mt-4 text-sm text-rose-300">
                {formError}
              </p>
            )}
            <div className="mt-8 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setStep(1);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                <ArrowLeft aria-hidden="true" size={16} /> Voltar
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                Criar categorias <ArrowRight aria-hidden="true" size={16} />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={finishSetup}>
            <h1 id="onboarding-title" className="text-2xl font-semibold text-zinc-100">
              {isReviewMode ? "Revise suas categorias" : "Crie suas primeiras categorias"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isReviewMode
                ? "Altere nomes, cores e limites ou adicione categorias. As categorias atuais não serão excluídas."
                : "Escolha os grupos que fazem sentido para você. O limite de cada categoria é opcional e pode ser alterado depois na aba Categorias."}
            </p>
            <div className="mt-5 space-y-3">
              {categories.map((category, index) => {
                const isSalaryCategory = isSalaryCategoryName(category.name);
                const isProtectedSalary =
                  Boolean(category.categoryId) && isSalaryCategory;

                return (
                  <fieldset
                    key={category.draftId}
                    className="grid gap-3 rounded-2xl border border-zinc-800 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                  >
                    <legend className="px-1 text-xs font-medium text-zinc-500">
                      Categoria {index + 1}
                      {isSalaryCategory && (
                        <span className="ml-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          Padrão · Receita
                        </span>
                      )}
                    </legend>
                    <label className="text-xs font-medium text-zinc-400">
                      Nome
                      <input
                        className={fieldClassName}
                        type="text"
                        maxLength={40}
                        value={category.name}
                        readOnly={isProtectedSalary}
                        onChange={(event) =>
                          updateCategory(category.draftId, "name", event.target.value)
                        }
                        placeholder="Ex.: Moradia"
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-400">
                      Cor
                      <CustomSelect
                        ariaLabel={`Cor da categoria ${index + 1}`}
                        value={category.color}
                        options={
                          CATEGORY_COLOR_OPTIONS.some(
                            (option) => option.value === category.color,
                          )
                            ? CATEGORY_COLOR_OPTIONS
                            : [
                                {
                                  value: category.color,
                                  label: "Cor existente",
                                  color: category.color,
                                },
                                ...CATEGORY_COLOR_OPTIONS,
                              ]
                        }
                        onChange={(value) =>
                          updateCategory(category.draftId, "color", value)
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-400">
                      Limite opcional (R$)
                      <input
                        className={fieldClassName}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={category.budgetLimit}
                        disabled={isProtectedSalary}
                        onChange={(event) =>
                          updateCategory(category.draftId, "budgetLimit", event.target.value)
                        }
                        placeholder="Sem limite"
                      />
                    </label>
                    {!isProtectedSalary && (!isReviewMode || !category.categoryId) && (
                      <button
                        type="button"
                        aria-label={`Remover categoria ${index + 1}`}
                        onClick={() =>
                          setCategories((current) =>
                            current.filter((item) => item.draftId !== category.draftId),
                          )
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-zinc-400 transition hover:bg-rose-400/10 hover:text-rose-300"
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    )}
                  </fieldset>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCategories((current) => [
                    ...current,
                    {
                      draftId: nextId.current++,
                      name: "",
                      color: CATEGORY_COLOR_OPTIONS[0].value,
                      budgetLimit: "",
                    },
                  ]);
                  setFormError("");
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-violet-300 transition hover:bg-violet-500/10"
              >
                <Plus aria-hidden="true" size={16} /> Adicionar outra categoria
              </button>
            </div>
            {formError && (
              <p role="alert" className="mt-4 text-sm text-rose-300">
                {formError}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setStep(2);
                }}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                <ArrowLeft aria-hidden="true" size={16} /> Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60"
              >
                <Check aria-hidden="true" size={16} />
                {isSubmitting
                  ? "Salvando..."
                  : isReviewMode
                    ? "Salvar configuração"
                    : "Concluir configuração"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
