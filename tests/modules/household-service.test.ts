import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "@/modules/categories/defaults";

const hash = vi.hoisted(() => vi.fn(async () => "hash-teste"));
const tx = vi.hoisted(() => ({
  user: { create: vi.fn(), update: vi.fn() },
  household: { create: vi.fn() },
  activityLog: { create: vi.fn() },
}));

vi.mock("bcryptjs", () => ({ default: { hash } }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (input: unknown) =>
      typeof input === "function" ? input(tx) : Promise.all(input as Promise<unknown>[]),
  },
}));

import { registerHousehold } from "@/modules/households/service";

const input = {
  name: "Ana Souza",
  email: "ana@familia.com",
  password: "familia123",
  householdName: "Financeiro da família",
};

describe("criação do espaço familiar", () => {
  beforeEach(() => {
    tx.user.create.mockResolvedValue({ id: "user-1", email: input.email, name: input.name });
    tx.household.create.mockResolvedValue({ id: "house-1", name: input.householdName });
    tx.activityLog.create.mockResolvedValue({});
  });

  it("cria o usuário, o espaço, o papel de responsável e as categorias", async () => {
    const user = await registerHousehold(input);

    expect(hash).toHaveBeenCalledWith("familia123", 12);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        name: "Ana Souza",
        email: "ana@familia.com",
        passwordHash: "hash-teste",
      },
    });
    expect(tx.household.create).toHaveBeenCalledWith({
      data: {
        name: "Financeiro da família",
        createdById: "user-1",
        members: { create: { userId: "user-1", role: "owner" } },
        categories: {
          create: DEFAULT_CATEGORIES.map((name, sortOrder) => ({ name, sortOrder })),
        },
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { activeHouseholdId: "house-1" },
    });
    expect(tx.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdId: "house-1",
        userId: "user-1",
        action: "created",
        entityType: "household",
      }),
    });
    expect(user).toMatchObject({ id: "user-1" });
  });

  it("traduz e-mail duplicado sem estourar a tela", async () => {
    tx.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "7.10.1",
      }),
    );

    await expect(registerHousehold(input)).resolves.toEqual({
      error: "Este e-mail já está cadastrado.",
    });
  });

  it("propaga falha que não é de cadastro duplicado", async () => {
    tx.user.create.mockRejectedValue(new Error("banco fora"));
    await expect(registerHousehold(input)).rejects.toThrow("banco fora");
  });
});
