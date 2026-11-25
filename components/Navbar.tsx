"use client";

/**
 * Apresenta a marca, o seletor de período e os atalhos das três áreas do app.
 */

// Importa os ícones da navegação e os controles de autenticação visual.
import {
  BookOpenText,
  ChartNoAxesCombined,
  ChartPie,
  CirclePlus,
  Layers3,
  LogOut,
  Menu,
  RotateCcw,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
// Lê o estado da sessão e oferece as ações OAuth do NextAuth.
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
// Reutiliza o alternador em qualquer ponto da aplicação.
import CustomMonthPicker from "./CustomMonthPicker";
import ThemeToggle from "./ThemeToggle";

/** Identifica qual seção está visível na página principal. */
export type FinanceTab = "dashboard" | "transactions" | "categories" | "profile";

/** Propriedades necessárias para sincronizar a navegação com a página. */
interface NavbarProps {
  /** Seção selecionada no momento. */
  activeTab: FinanceTab;
  /** Mês selecionado no formato YYYY-MM. */
  selectedMonth: string;
  /** Função que atualiza a seção aberta. */
  onTabChange: (tab: FinanceTab) => void;
  /** Função que atualiza o mês consultado. */
  onMonthChange: (month: string) => void;
  /** Atalho para abrir o formulário de uma nova transação. */
  onNewTransaction: () => void;
  /** Abre o lançamento compacto sem sair da tela atual. */
  onOpenQuickTransaction: () => void;
  /** Abre os indicadores do mês selecionado. */
  onOpenMonthlyInsights: () => void;
  /** Abre a configuração guiada com os dados financeiros atuais. */
  onReviewTutorial: () => void;
}

/** Descreve os botões de navegação para evitar repetir a marcação. */
const navigationItems: { id: FinanceTab; label: string; icon: typeof ChartNoAxesCombined }[] = [
  { id: "dashboard", label: "Visão geral", icon: ChartNoAxesCombined },
  { id: "transactions", label: "Transações", icon: WalletCards },
  { id: "categories", label: "Categorias", icon: Layers3 },
];

/** Barra de navegação responsiva com o seletor compartilhado de mês. */
export default function Navbar({
  activeTab,
  selectedMonth,
  onTabChange,
  onMonthChange,
  onNewTransaction,
  onOpenQuickTransaction,
  onOpenMonthlyInsights,
  onReviewTutorial,
}: NavbarProps) {
  // Consulta a sessão do usuário atual para exibir login ou perfil.
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const helpCloseButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenu(): void {
    setIsMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  function closeHelp(): void {
    setIsHelpOpen(false);
    menuButtonRef.current?.focus();
  }

  // Mantém o foco no menu lateral e oferece o fechamento pelo teclado.
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const drawer = drawerRef.current;
    const focusableElements = drawer?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusableElements?.[0]?.focus();

    function handleMenuKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab" && focusableElements?.length) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener("keydown", handleMenuKeyDown);
    return () => document.removeEventListener("keydown", handleMenuKeyDown);
  }, [isMenuOpen]);

  // Mantém a navegação por teclado dentro do guia e permite fechá-lo com Escape.
  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    helpCloseButtonRef.current?.focus();
    function handleHelpKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
        menuButtonRef.current?.focus();
      } else if (event.key === "Tab") {
        event.preventDefault();
        helpCloseButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleHelpKeyDown);
    return () => document.removeEventListener("keydown", handleHelpKeyDown);
  }, [isHelpOpen]);

  // Inicia OAuth Google e registra falhas de configuração do provedor.
  async function handleSignIn(): Promise<void> {
    try {
      // Retorna para a página principal depois da autenticação.
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      // Expõe falhas de autenticação no console em vez de ignorá-las.
      console.error("Não foi possível iniciar o login com Google.", error);
    }
  }

  // Encerra a sessão no NextAuth e retorna à tela inicial.
  async function handleSignOut(): Promise<void> {
    try {
      // Atualiza a sessão compartilhada e direciona o usuário ao login.
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      // Mantém um diagnóstico explícito caso a sessão não possa ser encerrada.
      console.error("Não foi possível encerrar a sessão.", error);
    }
  }

  return (
    <>
    <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
              <WalletCards aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="truncate whitespace-nowrap text-sm font-bold tracking-tight text-white sm:text-base">
                Controlador de Gastos
              </p>
              <p className="text-xs text-zinc-500">Seu dinheiro, com mais clareza</p>
            </div>
          </div>
          <CustomMonthPicker
            value={selectedMonth}
            onChange={onMonthChange}
            className="w-full shrink-0 sm:w-auto lg:hidden"
          />
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap"
        >
          <div className="flex w-full min-w-0 items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 lg:w-auto lg:flex-none">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition sm:gap-2 sm:px-3 sm:text-sm lg:flex-none ${
                  activeTab === id
                    ? "nav-active bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                {label}
              </button>
            ))}
          </div>

          <CustomMonthPicker
            value={selectedMonth}
            onChange={onMonthChange}
            className="hidden w-40 lg:block"
          />
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 sm:w-auto sm:flex-1 sm:text-sm lg:flex-none"
          >
            <CirclePlus aria-hidden="true" size={16} />
            <span>+ Nova transação</span>
          </button>
          {/* Mantém o menu da conta acessível no cabeçalho. */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            {status !== "loading" && session?.user ? (
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMenuOpen}
                aria-controls="account-drawer"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className="inline-flex size-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {isMenuOpen ? (
                  <X aria-hidden="true" size={19} />
                ) : (
                  <Menu aria-hidden="true" size={19} />
                )}
              </button>
            ) : status === "unauthenticated" ? (
              <button
                type="button"
                onClick={handleSignIn}
                className="min-w-max rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400 sm:px-4 sm:text-sm"
              >
                Entrar com Google
              </button>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-black/55"
          />
          <aside
            id="account-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-drawer-title"
            className="absolute right-0 top-0 flex h-dvh w-full max-w-sm flex-col border-l border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 id="account-drawer-title" className="font-semibold text-zinc-100">
                  Menu da conta
                </h2>
                <p className="mt-1 max-w-64 truncate text-xs text-zinc-400">
                  {session?.user?.name ?? session?.user?.email}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={closeMenu}
                className="inline-flex size-11 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <nav aria-label="Menu da conta">
              <button
                type="button"
                aria-current={activeTab === "profile" ? "page" : undefined}
                onClick={() => {
                  onTabChange("profile");
                  closeMenu();
                }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${
                  activeTab === "profile"
                    ? "drawer-nav-active bg-violet-500/15 text-violet-200"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <UserRound aria-hidden="true" size={18} />
                Perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenQuickTransaction();
                  closeMenu();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <CirclePlus aria-hidden="true" size={18} />
                Transação rápida
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenMonthlyInsights();
                  closeMenu();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <ChartPie aria-hidden="true" size={18} />
                Insights do mês
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsHelpOpen(true);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <BookOpenText aria-hidden="true" size={18} />
                Como funciona
              </button>
              <button
                type="button"
                onClick={() => {
                  onReviewTutorial();
                  closeMenu();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <RotateCcw aria-hidden="true" size={18} />
                Rever tutorial
              </button>
              <div className="my-4 border-t border-zinc-800 pt-4">
                <ThemeToggle showLabel />
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <LogOut aria-hidden="true" size={18} />
                Sair da conta
              </button>
            </nav>
          </aside>
        </div>
      )}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <button
            type="button"
            aria-label="Fechar guia"
            onClick={closeHelp}
            className="absolute inset-0 h-full w-full"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-it-works-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="how-it-works-title" className="text-lg font-semibold text-zinc-100">
                  Como funciona
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Um guia rápido para organizar seu dinheiro.
                </p>
              </div>
              <button
                type="button"
                ref={helpCloseButtonRef}
                aria-label="Fechar guia"
                onClick={closeHelp}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-300">
              <li><strong className="text-zinc-100">Transações:</strong> registre receitas e despesas com data, categoria e situação paga ou pendente.</li>
              <li><strong className="text-zinc-100">Categorias:</strong> organize os lançamentos e defina limites mensais por grupo.</li>
              <li><strong className="text-zinc-100">Visão geral:</strong> acompanhe o resumo do mês, os gastos por categoria e as análises históricas.</li>
              <li><strong className="text-zinc-100">Orçamento:</strong> o limite pessoal do Perfil orienta o resumo mensal; sem ele, o app usa a soma dos limites das categorias e, por fim, as receitas registradas.</li>
              <li><strong className="text-zinc-100">Dados:</strong> cada conta vê seus próprios registros; marcar uma despesa como paga não altera o valor nem a data.</li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
