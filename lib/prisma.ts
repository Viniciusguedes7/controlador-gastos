// Importa o cliente gerado e o adapter PostgreSQL obrigatório nesta versão do Prisma.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Declara um espaço global tipado para reaproveitar a conexão durante o hot-reload.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Confere a configuração antes de iniciar conexões, para apresentar um erro acionável.
function getDatabaseUrl(): string {
  // Lê o valor apenas no servidor e nunca o envia ao navegador.
  const databaseUrl = process.env.DATABASE_URL;

  // Interrompe a inicialização caso o ambiente não tenha sido configurado.
  if (!databaseUrl) {
    throw new Error("Configure DATABASE_URL antes de iniciar o Prisma.");
  }

  // Entrega a URL validada ao driver PostgreSQL.
  return databaseUrl;
}

// Reaproveita a instância existente no desenvolvimento e cria uma no primeiro acesso.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // O adapter mantém a conexão PostgreSQL explícita exigida pelo Prisma instalado.
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });

// Evita abrir conexões novas a cada atualização automática de módulos do Next.js.
if (process.env.NODE_ENV !== "production") {
  // Guarda a instância global somente em desenvolvimento.
  globalForPrisma.prisma = prisma;
}
