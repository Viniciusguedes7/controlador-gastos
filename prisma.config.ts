// Importa a configuração suportada pela CLI oficial do Prisma ORM.
import { defineConfig } from "prisma/config";
// Carrega o arquivo .env também quando uma configuração Prisma personalizada existe.
import "dotenv/config";

// Informa ao CLI onde estão o schema e as migrations deste projeto.
export default defineConfig({
  // Mantém a localização solicitada para o schema na raiz do repositório.
  schema: "prisma/schema.prisma",
  // Armazena migrations versionadas junto do schema financeiro.
  migrations: {
    path: "prisma/migrations",
  },
});
