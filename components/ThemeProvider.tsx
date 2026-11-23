"use client";

// Importa os recursos React usados para acompanhar uma preferência externa.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Restringe a preferência aos dois temas oferecidos pela interface.
export type Theme = "dark" | "light";

// Define os valores disponíveis às telas descendentes.
interface ThemeContextValue {
  // Tema aplicado ao documento.
  theme: Theme;
  // Alterna de forma imediata entre claro e escuro.
  toggleTheme: () => void;
}

// Usa uma chave estável para salvar a escolha localmente no navegador.
const THEME_STORAGE_KEY = "controlador-gastos-tema";
// Notifica a mesma aba quando o botão altera a preferência externa.
const THEME_CHANGE_EVENT = "controlador-gastos-theme-change";

// Compartilha o estado de tema sem prop drilling entre componentes.
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Define as propriedades do provider que envolve a aplicação.
interface ThemeProviderProps {
  // Recebe a árvore de componentes a estilizar.
  children: ReactNode;
}

// Lê a preferência salva sem criar um estado React duplicado.
function readThemeSnapshot(): Theme {
  // Preserva o padrão escuro caso o código seja executado fora do navegador.
  if (typeof window === "undefined") {
    return "dark";
  }
  // Aceita somente um dos dois valores documentados no armazenamento local.
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

// Fornece um valor inicial estável durante renderização no servidor e hidratação.
function getServerThemeSnapshot(): Theme {
  // Usa o modo escuro como padrão universal para evitar divergência de marcação.
  return "dark";
}

// Escuta mudanças feitas nesta aba ou em outra janela do mesmo navegador.
function subscribeToTheme(onThemeChange: () => void): () => void {
  // Atualiza os componentes quando outra aba alterar o localStorage.
  window.addEventListener("storage", onThemeChange);
  // Atualiza os componentes quando o botão alterar a preferência nesta aba.
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  // Remove os ouvintes ao desmontar o provider.
  return () => {
    window.removeEventListener("storage", onThemeChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  };
}

// Inicializa o tema escuro e acompanha alterações persistidas no navegador.
export default function ThemeProvider({ children }: ThemeProviderProps) {
  // Usa a assinatura do armazenamento para manter servidor e cliente sincronizados.
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readThemeSnapshot,
    getServerThemeSnapshot,
  );

  // Sincroniza o atributo do documento, consumido pelas regras de tema do CSS.
  useEffect(() => {
    // Aplica o estado recebido pelo React em todas as telas existentes.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Persiste o tema escolhido e notifica os componentes inscritos imediatamente.
  const toggleTheme = useCallback((): void => {
    // Calcula o valor seguinte a partir da preferência externa atual.
    const nextTheme: Theme = readThemeSnapshot() === "dark" ? "light" : "dark";
    // Salva a preferência para a próxima visita.
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    // Atualiza o CSS antes do próximo redesenho da interface.
    document.documentElement.dataset.theme = nextTheme;
    // Notifica o React na aba atual para redesenhar rótulos e ícones.
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  // Memoriza os valores compartilhados enquanto o tema atual não mudar.
  const contextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  // Disponibiliza a preferência de tema a toda a árvore do aplicativo.
  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

// Fornece um hook que informa claramente quando usado fora do provider.
export function useTheme(): ThemeContextValue {
  // Lê o valor mais próximo da árvore React.
  const context = useContext(ThemeContext);
  // Explica a causa de erro de configuração em vez de retornar um fallback silencioso.
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }

  // Devolve o estado e a ação tipados ao componente.
  return context;
}
