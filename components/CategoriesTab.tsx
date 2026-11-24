"use client";

/**
 * Permite organizar os grupos de gastos e ajustar seus limites mensais.
 */

import { useState, type FormEvent } from "react";
import { Check, Layers3, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Category } from "../types/finance";
import { isSalaryCategoryName } from "../lib/category-utils";
import { CATEGORY_COLOR_OPTIONS } from "../lib/category-colors";
import CustomSelect from "./CustomSelect";

/** Valores controlados antes da criação ou atualização de uma categoria. */
interface CategoryFormValues {
  /** Nome que será mostrado nos filtros e nos relatórios. */
  name: string;
  /** Cor hexadecimal selecionada para diferenciar a categoria. */
  color: string;
  /** Limite mensal informado em reais. */
  budgetLimit: string;
}

/** Propriedades para ler categorias e executar as alterações no hook. */
interface CategoriesTabProps {
  /** Categorias atualmente disponíveis no aplicativo. */
  categories: Category[];
  /** Limite mensal geral salvo no Perfil, se informado. */
  monthlySpendingLimit: number | null;
  /** Cria uma categoria sem identificador, que será atribuído pelo hook. */
  onAdd: (category: Omit<Category, "id">) => void;
  /** Atualiza uma categoria existente. */
  onEdit: (category: Category) => void;
  /** Exclui uma categoria e os lançamentos vinculados. */
  onRemove: (categoryId: string) => void;
}

/** Classes compartilhadas pelos campos deste formulário. */
const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15";

/** Formata os limites de orçamento em moeda brasileira. */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Gerencia a criação, edição e remoção das categorias de orçamento. */
export default function CategoriesTab({
  categories,
  monthlySpendingLimit,
  onAdd,
  onEdit,
  onRemove,
}: CategoriesTabProps) {
  /** Armazena a categoria que está em edição ou null para uma inclusão. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Guarda mensagens explicativas de validação do formulário. */
  const [formError, setFormError] = useState("");
  /** Mantém os campos preenchidos pelo usuário até o envio do formulário. */
  const [formValues, setFormValues] = useState<CategoryFormValues>({
    name: "",
    color: CATEGORY_COLOR_OPTIONS[0].value,
    budgetLimit: "",
  });
  const availableColorOptions = CATEGORY_COLOR_OPTIONS.some(
    (option) => option.value === formValues.color,
  )
    ? CATEGORY_COLOR_OPTIONS
    : [
        {
          value: formValues.color,
          label: "Cor existente",
          color: formValues.color,
        },
        ...CATEGORY_COLOR_OPTIONS,
      ];
  const editingCategory = categories.find((category) => category.id === editingId);
  const isEditingSalary =
    editingCategory !== undefined && isSalaryCategoryName(editingCategory.name);
  const allocatedLimit = categories.reduce(
    (total, category) =>
      total + (isSalaryCategoryName(category.name) ? 0 : category.budgetLimit),
    0,
  );
  const remainingLimit =
    monthlySpendingLimit === null ? null : monthlySpendingLimit - allocatedLimit;

  /** Atualiza um campo do formulário sem substituir os demais valores. */
  function updateFormValue<Key extends keyof CategoryFormValues>(
    key: Key,
    value: CategoryFormValues[Key],
  ): void {
    setFormValues((currentValues) => ({ ...currentValues, [key]: value }));
  }

  /** Retorna os campos ao padrão para a próxima categoria. */
  function resetForm(): void {
    setEditingId(null);
    setFormError("");
    setFormValues({
      name: "",
      color: CATEGORY_COLOR_OPTIONS[0].value,
      budgetLimit: "",
    });
  }

  /** Copia uma categoria para o formulário e habilita o modo de edição. */
  function startEditing(category: Category): void {
    setEditingId(category.id);
    setFormError("");
    setFormValues({
      name: category.name,
      color: category.color,
      budgetLimit: String(category.budgetLimit),
    });
    document.getElementById("category-form")?.scrollIntoView({ behavior: "smooth" });
  }

  /** Confere os campos e delega a gravação para o componente que mantém o estado. */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedLimit = Number(formValues.budgetLimit.replace(",", "."));

    if (!formValues.name.trim()) {
      setFormError("Informe um nome para a categoria.");
      return;
    }

    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
      setFormError("Informe um limite igual ou maior que zero.");
      return;
    }

    const categoryData = {
      name: formValues.name.trim(),
      color: formValues.color,
      budgetLimit: parsedLimit,
    };

    if (editingId) {
      onEdit({ ...categoryData, id: editingId });
    } else {
      onAdd(categoryData);
    }

    resetForm();
  }

  /** Evita remover sem confirmação e limpa o formulário se ele editar esse item. */
  function handleRemove(category: Category): void {
    if (isSalaryCategoryName(category.name)) {
      return;
    }

    const shouldRemove = window.confirm(
      `Excluir "${category.name}" também removerá as transações vinculadas. Deseja continuar?`,
    );

    if (shouldRemove) {
      onRemove(category.id);
      if (editingId === category.id) {
        resetForm();
      }
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Categorias</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Crie grupos e defina limites para planejar melhor seus gastos.
        </p>
      </div>

      <section
        id="category-form"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-100">
              {editingId ? "Editar categoria" : "Nova categoria"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              O limite ajuda a acompanhar o quanto foi usado no mês.
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

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-xs font-medium text-zinc-400">
            Nome
            <input
              className={fieldClassName}
              type="text"
              value={formValues.name}
              readOnly={isEditingSalary}
              onChange={(event) => updateFormValue("name", event.target.value)}
              placeholder="Ex.: Pets"
              maxLength={40}
              aria-describedby={isEditingSalary ? "salary-category-name-help" : undefined}
            />
            {isEditingSalary && (
              <span id="salary-category-name-help" className="mt-1 block text-[11px] text-zinc-500">
                O nome da categoria padrão não pode ser alterado.
              </span>
            )}
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Cor
            <CustomSelect
              ariaLabel="Cor da categoria"
              value={formValues.color}
              options={availableColorOptions}
              onChange={(value) => updateFormValue("color", value)}
            />
          </label>
          <label className="text-xs font-medium text-zinc-400">
            Limite mensal (R$)
            <input
              className={fieldClassName}
              type="number"
              value={formValues.budgetLimit}
              onChange={(event) => updateFormValue("budgetLimit", event.target.value)}
              min="0"
              step="0.01"
              placeholder="0,00"
              disabled={isEditingSalary}
            />
          </label>
          <button
            type="submit"
            className="mt-1.5 flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            {editingId ? <Check aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            {editingId ? "Salvar" : "Adicionar"}
          </button>
          {formError && (
            <p role="alert" className="text-sm text-rose-300 sm:col-span-2 lg:col-span-4">
              {formError}
            </p>
          )}
        </form>
      </section>

      <section
        aria-label="Distribuição do limite mensal"
        className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:grid-cols-3 sm:p-6"
      >
        <div>
          <p className="text-xs text-zinc-500">Limite mensal total</p>
          <p className="mt-1 font-semibold text-zinc-100">
            {monthlySpendingLimit === null
              ? "Não definido no Perfil"
              : currencyFormatter.format(monthlySpendingLimit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Distribuído entre categorias</p>
          <p className="mt-1 font-semibold text-zinc-100">
            {currencyFormatter.format(allocatedLimit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Restante para distribuir</p>
          <p
            className={`mt-1 font-semibold ${
              remainingLimit !== null && remainingLimit < 0
                ? "text-amber-300"
                : "text-emerald-300"
            }`}
          >
            {remainingLimit === null
              ? "Defina o limite no Perfil"
              : currencyFormatter.format(remainingLimit)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-zinc-100">Suas categorias</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {categories.length} {categories.length === 1 ? "categoria cadastrada" : "categorias cadastradas"}
            </p>
          </div>
          <Layers3 aria-hidden="true" size={19} className="text-zinc-500" />
        </div>

        {categories.length > 0 ? (
          <ul className="divide-y divide-zinc-800/80">
            {categories.map((category) => {
              const isSalaryCategory = isSalaryCategoryName(category.name);
              return (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap sm:px-6"
                >
                  <span
                    aria-hidden="true"
                    className="category-color-swatch size-3 shrink-0 rounded-full ring-4 ring-zinc-800"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {category.name}
                    </p>
                    {isSalaryCategory && (
                      <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Padrão · Receita
                      </span>
                    )}
                  </div>
                  <p className="w-full text-xs text-zinc-400 sm:w-auto sm:text-sm">
                    {category.budgetLimit > 0
                      ? currencyFormatter.format(category.budgetLimit)
                      : "Sem limite mensal"}
                    <span className="ml-1 text-zinc-600">/ mês</span>
                  </p>
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      aria-label={`Editar categoria ${category.name}`}
                      onClick={() => startEditing(category)}
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-violet-300"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    {!isSalaryCategory && (
                      <button
                        type="button"
                        aria-label={`Excluir categoria ${category.name}`}
                        onClick={() => handleRemove(category)}
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-400/10 hover:text-rose-300"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            Ainda não há categorias. Use o formulário acima para criar a primeira.
          </p>
        )}
      </section>
    </section>
  );
}
