import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Compartilha a sessão do NextAuth com componentes clientes.
import AuthProvider from "../components/AuthProvider";
// Aplica a preferência de cores escolhida no navegador.
import ThemeProvider from "../components/ThemeProvider";
import "./globals.css";

// Configura a fonte sem serifa usada pela interface.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Configura a fonte monoespaçada disponível para conteúdo técnico.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Informa título e resumo usados pelo navegador e pelos mecanismos de busca.
export const metadata: Metadata = {
  title: "Controlador de Gastos",
  description: "Organize suas receitas, despesas e orçamentos mensais.",
};

// Fornece fontes, autenticação e tema para todas as páginas do App Router.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full max-w-full overflow-x-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full max-w-full overflow-x-hidden flex flex-col">
        {/* Compartilha autenticação e tema sem adicionar lógica a cada página. */}
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
