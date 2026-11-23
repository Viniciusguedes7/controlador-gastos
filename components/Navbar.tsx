"use client";

/**
 * Apresenta a marca, o seletor de período e os atalhos das três áreas do app.
 */

// Importa os ícones da navegação e os controles de autenticação visual.
import {
  CalendarDays,
  ChartNoAxesCombined,
  CirclePlus,
  Layers3,
  LogOut,
  WalletCards,
} from "lucide-react";
// Otimiza a imagem de perfil enviada pelo provedor OAuth.
import Image from "next/image";
// Lê o estado da sessão e oferece as ações OAuth do NextAuth.
import { signIn, signOut, useSession } from "next-auth/react";
// Reutiliza o alternador em qualquer ponto da aplicação.
import ThemeToggle from "./ThemeToggle";

/** Identifica qual seção está visível na página principal. */
export type FinanceTab = "dashboard" | "transactions" | "categories";

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
}

/** Descreve os botões de navegação para evitar repetir a marcação. */
const navigationItems: { id: FinanceTab; label: string; icon: typeof ChartNoAxesCombined }[] = [
  { id: "dashboard", label: "Dashboard", icon: ChartNoAxesCombined },
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
}: NavbarProps) {
  // Consulta a sessão do usuário atual para exibir login ou perfil.
  const { data: session, status } = useSession();

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
    <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
              <WalletCards aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white sm:text-base">
                Controlador de Gastos
              </p>
              <p className="text-xs text-zinc-500">Seu dinheiro, com mais clareza</p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 lg:hidden">
            <CalendarDays aria-hidden="true" size={16} className="text-zinc-500" />
            <span className="sr-only">Mês de referência</span>
            <input
              aria-label="Mês de referência"
              className="w-[7.5rem] bg-transparent text-xs outline-none [color-scheme:dark]"
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
        </div>

        <nav aria-label="Navegação principal" className="flex items-center gap-2 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  activeTab === id
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                {label}
              </button>
            ))}
          </div>

          <label className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 lg:flex">
            <CalendarDays aria-hidden="true" size={16} className="text-zinc-500" />
            <span className="sr-only">Mês de referência</span>
            <input
              aria-label="Mês de referência"
              className="w-32 bg-transparent text-xs outline-none [color-scheme:dark]"
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex min-w-max items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 sm:px-4 sm:text-sm"
          >
            <CirclePlus aria-hidden="true" size={16} />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Nova</span>
          </button>
          {/* Mantém o seletor de tema acessível junto das ações principais. */}
          <ThemeToggle />
          {/* Exibe controles de conta somente depois de resolver a sessão. */}
          {status !== "loading" && session?.user ? (
            <div className="flex min-w-max items-center gap-2">
              {/* Mostra a foto do perfil ou uma inicial quando o provedor não envia imagem. */}
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200"
                >
                  {(session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase()}
                </span>
              )}
              {/* Mantém o nome legível em telas médias e grandes. */}
              <span className="hidden max-w-32 truncate text-xs text-zinc-300 sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              {/* Permite encerrar a sessão da conta atual. */}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                <LogOut aria-hidden="true" size={15} />
                Sair
              </button>
            </div>
          ) : status === "unauthenticated" ? (
            /* Solicita a autenticação Google antes de mostrar dados pessoais. */
            <button
              type="button"
              onClick={handleSignIn}
              className="min-w-max rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400 sm:px-4 sm:text-sm"
            >
              Entrar com Google
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
