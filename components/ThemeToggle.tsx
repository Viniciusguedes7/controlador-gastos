"use client";

// Importa ícones que comunicam os dois estados possíveis do tema.
import { Moon, Sun } from "lucide-react";
// Lê a preferência global e a ação de alternância.
import { useTheme } from "./ThemeProvider";

// Permite alternar entre as cores claras e escuras a partir de qualquer tela.
export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  // Obtém o tema atual para definir rótulo, ícone e ação acessível.
  const { theme, toggleTheme } = useTheme();
  // Define se a próxima ação ativa a aparência clara.
  const switchesToLight = theme === "dark";
  // Exibe um botão com texto acessível mesmo quando apenas o ícone é visível.
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={switchesToLight ? "Ativar tema claro" : "Ativar tema escuro"}
      title={switchesToLight ? "Ativar tema claro" : "Ativar tema escuro"}
      className={`inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 ${
        showLabel ? "min-h-12 w-full justify-start" : ""
      }`}
    >
      {/* Representa o tema claro como destino quando a tela está escura. */}
      {switchesToLight ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
      <span className={showLabel ? "" : "sr-only"}>
        {switchesToLight ? "Tema claro" : "Tema escuro"}
      </span>
    </button>
  );
}
