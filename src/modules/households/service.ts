import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/modules/categories/defaults";

export async function registerHousehold(input: {
  name: string;
  email: string;
  password: string;
  householdName: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
        },
      });

      const household = await tx.household.create({
        data: {
          name: input.householdName,
          createdById: user.id,
          members: {
            create: { userId: user.id, role: "owner" },
          },
          categories: {
            create: DEFAULT_CATEGORIES.map((name, sortOrder) => ({
              name,
              sortOrder,
            })),
          },
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { activeHouseholdId: household.id },
      });

      await tx.activityLog.create({
        data: {
          householdId: household.id,
          userId: user.id,
          entityType: "household",
          entityId: household.id,
          action: "created",
          description: "Espaço financeiro criado",
        },
      });

      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Este e-mail já está cadastrado." as const };
    }
    throw error;
  }
}
