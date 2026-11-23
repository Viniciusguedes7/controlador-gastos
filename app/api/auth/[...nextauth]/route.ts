// Importa o handler oficial que implementa os endpoints do NextAuth v4.
import NextAuth from "next-auth";
// Compartilha uma única configuração entre login, logout e sessão.
import { authOptions } from "../../../../lib/auth";

// Cria handlers compatíveis com o Route Handler do App Router.
const handler = NextAuth(authOptions);

// Atende as requisições OAuth e de leitura da sessão.
export { handler as GET, handler as POST };
