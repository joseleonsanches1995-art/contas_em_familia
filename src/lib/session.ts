import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireMembership() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeHouseholdId: true },
  });
  if (!user) redirect("/entrar");

  const include = { household: true, user: true } as const;
  const preferred = await prisma.householdMember.findFirst({
    where: {
      userId: session.user.id,
      ...(user.activeHouseholdId ? { householdId: user.activeHouseholdId } : {}),
    },
    include,
    orderBy: { joinedAt: "asc" },
  });
  if (preferred) return preferred;
  if (!user.activeHouseholdId) redirect("/entrar");

  const fallback = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include,
    orderBy: { joinedAt: "asc" },
  });
  if (!fallback) redirect("/entrar");
  return fallback;
}
