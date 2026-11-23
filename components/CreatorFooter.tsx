"use client";

// Importa ícones de contato e o símbolo Git disponível na versão instalada.
import { GitFork, Mail } from "lucide-react";
// Importa estado, efeitos e referência para controlar o painel acessível.
import { useEffect, useId, useRef, useState } from "react";

// Apresenta os créditos e os canais de contato sem interferir no conteúdo da página.
export default function CreatorFooter() {
  // Guarda se as opções de contato estão visíveis.
  const [isOpen, setIsOpen] = useState(false);
  // Permite associar o botão ao painel com um identificador único.
  const optionsId = useId();
  // Identifica o contêiner para reconhecer cliques feitos fora dele.
  const footerRef = useRef<HTMLElement | null>(null);

  // Fecha as opções quando o usuário interage fora do rodapé ou pressiona Escape.
  useEffect(() => {
    // Não instala ouvintes enquanto o painel estiver fechado.
    if (!isOpen) {
      return;
    }

    // Fecha o painel somente quando o clique não pertence ao componente.
    function handleOutsidePointerDown(event: PointerEvent): void {
      // Confirma que o alvo é um nó e está fora do contêiner do rodapé.
      if (
        footerRef.current &&
        event.target instanceof Node &&
        !footerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    // Oferece uma forma de teclado para fechar as opções abertas.
    function handleEscapeKeyDown(event: KeyboardEvent): void {
      // Fecha o painel ao receber a tecla Escape.
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    // Observa interações globais enquanto o painel está aberto.
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscapeKeyDown);

    // Remove os ouvintes ao fechar o painel ou desmontar o componente.
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [isOpen]);

  // Renderiza o crédito discreto e expande as opções sem sobrepor outros elementos.
  return (
    <footer
      ref={footerRef}
      className="w-full border-t border-zinc-800/80 px-4 py-4 text-center text-xs text-zinc-500"
    >
      {/* Agrupa o acionador e suas opções para mantê-los centralizados. */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3">
        {/* Abre ou fecha os canais de contato sem navegar para outra página. */}
        <button
          type="button"
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          aria-expanded={isOpen}
          aria-controls={optionsId}
          className="rounded-md px-2 py-1 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          Desenvolvido por Lucas Vinicius <span aria-hidden="true">•</span> Contato
        </button>

        {/* Mantém as duas opções em uma linha quando houver espaço e permite quebra no celular. */}
        {isOpen && (
          <div
            id={optionsId}
            role="group"
            aria-label="Opções de contato do criador"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {/* Abre o perfil do criador em uma nova aba sem compartilhar a janela atual. */}
            <a
              href="https://github.com/Viniciusguedes7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/80 px-3 py-2 text-zinc-300 transition hover:bg-zinc-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {/* Usa o símbolo Git da biblioteca, que não inclui logotipos de marcas. */}
              <GitFork aria-hidden="true" size={15} />
              GitHub
            </a>

            {/* Abre a composição do Gmail no navegador com o endereço de contato preenchido. */}
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=lucasvinicius10%40gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Entre em contato diretamente por e-mail"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/80 px-3 py-2 text-zinc-300 transition hover:bg-zinc-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Mail aria-hidden="true" size={15} />
              E-mail de contato
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
