import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

/** Exclui a conta autenticada e seus registros em uma única transação. */
export async function DELETE(): Promise<Response> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json(
      { error: "É necessário entrar na conta para solicitar a exclusão." },
      { status: 401 },
    );
  }

  try {
    const deleted = await prisma.$transaction(async (database) => {
      const user = await database.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        return false;
      }

      await database.transaction.deleteMany({ where: { userId } });
      await database.category.deleteMany({ where: { userId } });
      await database.account.deleteMany({ where: { userId } });
      await database.session.deleteMany({ where: { userId } });
      await database.user.delete({ where: { id: userId } });
      return true;
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    if (!deleted) {
      return Response.json(
        { error: "A conta já não existe ou não pode ser localizada." },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Não foi possível excluir a conta autenticada.", error);
    return Response.json(
      { error: "Não foi possível excluir a conta. Nenhum dado foi removido." },
      { status: 500 },
    );
  }
}
