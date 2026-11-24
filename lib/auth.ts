// Importa o adapter que persiste usuários, contas e sessões no PostgreSQL.
import { PrismaAdapter } from "@auth/prisma-adapter";
// Importa as opções tipadas do NextAuth v4.
import type { NextAuthOptions } from "next-auth";
// Habilita o login por conta Google.
import GoogleProvider from "next-auth/providers/google";
// Compartilha a conexão Prisma do servidor.
import { prisma } from "./prisma";

// Exige credenciais OAuth para falhar com uma mensagem útil em vez de usar strings vazias.
function requireAuthEnvironmentVariable(
  name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET",
): string {
  // Consulta a configuração privada disponível somente no servidor.
  const value = process.env[name];
  // Interrompe a inicialização se a integração Google não estiver configurada.
  if (!value) {
    throw new Error(`Configure ${name} antes de habilitar o login com Google.`);
  }
  // Retorna a credencial validada ao provider do NextAuth.
  return value;
}

// Reúne autenticação, persistência de sessão e extensão dos dados da sessão.
export const authOptions: NextAuthOptions = {
  // Usa o banco para persistir usuários, tokens e sessões do provedor.
  adapter: PrismaAdapter(prisma),
  // Seleciona o fluxo OAuth do Google e valida as variáveis exigidas.
  providers: [
    GoogleProvider({
      clientId: requireAuthEnvironmentVariable("GOOGLE_CLIENT_ID"),
      clientSecret: requireAuthEnvironmentVariable("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  // Escolhe sessões no banco para manter o adapter e a sessão sincronizados.
  session: { strategy: "database" },
  // Define a chave usada pelo NextAuth para assinar e proteger cookies.
  secret: process.env.NEXTAUTH_SECRET,
  // Personaliza os dados de sessão usados pela interface e pelas ações seguras.
  callbacks: {
    // Expõe o identificador do usuário autenticado para a interface cliente.
    async session({ session, user }) {
      // Só adiciona o ID quando o objeto da sessão contém uma pessoa.
      if (session.user) {
        // Compartilha o mesmo identificador que as ações verificam no servidor.
        session.user.id = user.id;
      }

      // Retorna a sessão completa ao chamador.
      return session;
    },
  },
};
