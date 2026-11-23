// Amplia os tipos do NextAuth para que o identificador seja reconhecido em toda a aplicação.
import "next-auth";

// Mantém o ID acessível na sessão e tipado para as ações protegidas.
declare module "next-auth" {
  // Inclui campos próprios da aplicação no objeto de usuário da sessão.
  interface Session {
    // Mantém as informações originais e inclui o ID persistido pelo Prisma.
    user: {
      // Chave usada para isolar as consultas de dados financeiros.
      id: string;
      // Nome e e-mail continuam opcionais conforme o provedor OAuth.
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
