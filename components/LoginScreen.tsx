"use client";

// Importa o ícone Google usado no botão de autenticação.
import { ArrowRight, ChartNoAxesCombined, CircleDollarSign, ShieldCheck } from "lucide-react";
// Importa o fluxo de login OAuth mantido pelo NextAuth.
import { signIn } from "next-auth/react";
// Usa estado local para apresentar falhas do provedor sem ocultá-las.
import { useState } from "react";
// Reutiliza o botão de tema mesmo quando o usuário ainda não entrou.
import ThemeToggle from "./ThemeToggle";
// Mostra os créditos e os canais de contato também antes da autenticação.
import CreatorFooter from "./CreatorFooter";

// Apresenta os benefícios do aplicativo e oferece autenticação Google.
export default function LoginScreen() {
  // Registra uma mensagem se o fluxo OAuth retornar uma falha.
  const [error, setError] = useState("");

  // Inicia o OAuth e mantém explícitos erros de inicialização.
  async function handleGoogleSignIn(): Promise<void> {
    // Limpa qualquer aviso antigo antes de iniciar uma nova tentativa.
    setError("");
    try {
      // Redireciona o navegador para o provedor Google e solicita retorno à página inicial.
      await signIn("google", { callbackUrl: "/" });
    } catch (signInError) {
      // Registra a falha para diagnóstico sem esconder sua origem no console.
      console.error("Não foi possível iniciar o login com Google.", signInError);
      // Exibe uma mensagem compreensível e mantém a tela utilizável.
      setError("Não foi possível iniciar o login. Tente novamente.");
    }
  }

  // Desenha uma página independente, centralizada e adaptada ao tema escolhido.
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Centraliza o cartão de login e reserva espaço para o rodapé abaixo dele. */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {/* Limita a largura do cartão para manter a leitura confortável em telas grandes. */}
        <section className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-2xl shadow-black/20 sm:p-10">
          {/* Posiciona a marca e o controle de tema na mesma linha. */}
          <div className="mb-10 flex items-center justify-between">
            {/* Identifica visualmente o propósito do produto. */}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500 text-white">
              <ChartNoAxesCombined aria-hidden="true" size={23} />
            </div>
            {/* Permite escolher o tema antes mesmo da autenticação. */}
            <ThemeToggle />
          </div>

          {/* Apresenta a proposta de valor antes de solicitar a entrada. */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
            Finanças com clareza
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Seu dinheiro, organizado em um só lugar.
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Acompanhe receitas, despesas e limites mensais com uma visão simples e segura.
          </p>

          {/* Resume os recursos para explicar o que a conta autenticada pode acessar. */}
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <CircleDollarSign aria-hidden="true" className="text-emerald-400" size={19} />
              Acompanhe seus gastos e receitas por categoria.
            </li>
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <ChartNoAxesCombined aria-hidden="true" className="text-violet-300" size={19} />
              Visualize saldos e orçamentos do mês.
            </li>
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <ShieldCheck aria-hidden="true" className="text-sky-400" size={19} />
              Seus dados ficam isolados na sua conta.
            </li>
          </ul>

          {/* Inicia o login via Google sem enviar dados financeiros ao navegador. */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-9 flex w-full items-center justify-center gap-3 rounded-xl bg-violet-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            {/* Usa o símbolo do provedor para tornar a ação facilmente reconhecível. */}
            <span aria-hidden="true" className="text-base font-bold">G</span>
            Entrar com Google
            <ArrowRight aria-hidden="true" size={17} />
          </button>

          {/* Torna falhas OAuth visíveis para que o usuário possa tentar novamente. */}
          {error && (
            <p role="alert" className="mt-4 text-center text-sm text-rose-300">
              {error}
            </p>
          )}

          {/* Explica por que o login é necessário para separar os registros por usuário. */}
          <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
            Ao entrar, somente você poderá consultar e alterar suas categorias e transações.
          </p>
        </section>
      </main>
      {/* Mantém o contato abaixo do cartão sem cobrir a navegação em telas pequenas. */}
      <CreatorFooter />
    </div>
  );
}
