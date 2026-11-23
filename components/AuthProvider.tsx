"use client";

// Importa o provider cliente do NextAuth para compartilhar a sessão nas telas.
import { SessionProvider } from "next-auth/react";
// Importa o tipo React dos elementos filhos do layout.
import type { ReactNode } from "react";

// Define as propriedades mínimas deste componente de contexto.
interface AuthProviderProps {
  // Recebe as páginas que podem consultar a sessão.
  children: ReactNode;
}

// Encapsula a árvore para que useSession e signIn consultem o mesmo estado.
export default function AuthProvider({ children }: AuthProviderProps) {
  // Mantém a sessão sincronizada com os endpoints configurados no NextAuth.
  return <SessionProvider>{children}</SessionProvider>;
}
