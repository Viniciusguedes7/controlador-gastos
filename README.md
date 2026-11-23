# Controlador de Gastos

Aplicação de controle financeiro com Next.js App Router, autenticação Google via
NextAuth.js e persistência PostgreSQL com Prisma.

## Pré-requisitos

- Node.js e npm instalados.
- Uma instância PostgreSQL acessível.
- Credenciais OAuth 2.0 de um cliente Google.

## Configuração do ambiente

Crie ou atualize o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/NOME_DO_BANCO?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-uma-chave-secreta-forte"
GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"
```

No cliente OAuth do Google, configure a URL de redirecionamento autorizada:

```text
http://localhost:3000/api/auth/callback/google
```

Em produção, substitua `NEXTAUTH_URL` e a URL de callback pelo domínio HTTPS da
aplicação. Mantenha as credenciais privadas e nunca as envie ao navegador ou ao
controle de versão.

## Preparar o banco e executar

Instale as dependências, gere o cliente Prisma, crie as tabelas e inicie o
servidor:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. No primeiro
login de cada usuário, são criadas cinco categorias iniciais. Todas as consultas
e alterações financeiras são limitadas ao usuário autenticado. As ações na
interface são otimistas e são revertidas se o servidor não conseguir salvar.

Para inspecionar os registros localmente, use:

```bash
npx prisma studio
```

Em produção, aplique as migrations já versionadas com:

```bash
npx prisma migrate deploy
```
