/** Identifica a categoria obrigatória de receitas sem diferenciar maiúsculas. */
export function isSalaryCategoryName(name: string): boolean {
  return name.trim().toLocaleLowerCase("pt-BR") === "salário";
}

/** Normaliza nomes de categoria para detectar duplicatas no mesmo usuário. */
export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase("pt-BR");
}
