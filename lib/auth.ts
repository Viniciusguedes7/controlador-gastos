// Importa o adapter que persiste usuários, contas e sessões no PostgreSQL.
import { PrismaAdapter } from "@auth/prisma-adapter";
// Importa as opções tipadas do NextAuth v4.
import type { NextAuthOptions } from "next-auth";
// Habilita o login por conta Google.
import GoogleProvider from "next-auth/providers/google";
// Compartilha a conexão Prisma do servidor.
import { prisma } from "./prisma";

// Define categorias iniciais com cores e limites padrão para novas contas.
const defaultCategories = [
  { name: "Alimentação", color: "#34d399", budgetLimit: 1200 },
  { name: "Moradia", color: "#fbbf24", budgetLimit: 1500 },
  { name: "Lazer", color: "#a78bfa", budgetLimit: 600 },
  { name: "Transporte", color: "#2dd4bf", budgetLimit: 400 },
  { name: "Salário", color: "#34d399", budgetLimit: 0 },
];

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
  // Personaliza a sessão e cria os dados iniciais após a primeira conta.
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
  // Executa a criação inicial de categorias após o adapter persistir a nova pessoa.
  events: {
    // Vincula as categorias ao identificador criado pelo NextAuth.
    async createUser({ user }) {
      // Insere as cinco categorias em uma única operação de banco.
      await prisma.category.createMany({
        data: defaultCategories.map((category) => ({
          ...category,
          userId: user.id,
        })),
      });
    },
  },
};
