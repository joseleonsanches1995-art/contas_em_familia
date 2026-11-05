import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const findUser = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { householdMember: { findFirst }, user: { findUnique: findUser } },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { requireMembership } from "@/lib/session";

describe("acesso ao espaço", () => {
  it("manda para o login quem não tem sessão", async () => {
    auth.mockResolvedValue(null);
    await expect(requireMembership()).rejects.toThrow("NEXT_REDIRECT:/entrar");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("manda para o login quem não é membro de nenhum espaço", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    findUser.mockResolvedValue({ activeHouseholdId: null });
    findFirst.mockResolvedValue(null);
    await expect(requireMembership()).rejects.toThrow("NEXT_REDIRECT:/entrar");
  });

  it("devolve o espaço mais antigo do usuário, com a família e o perfil", async () => {
    const membership = { householdId: "house-1", userId: "user-1" };
    auth.mockResolvedValue({ user: { id: "user-1" } });
    findUser.mockResolvedValue({ activeHouseholdId: null });
    findFirst.mockResolvedValue(membership);

    await expect(requireMembership()).resolves.toBe(membership);
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { household: true, user: true },
      orderBy: { joinedAt: "asc" },
    });
  });

  it("abre o espaço escolhido quando a pessoa participa de mais de um", async () => {
    const membership = { householdId: "house-2", userId: "user-1" };
    auth.mockResolvedValue({ user: { id: "user-1" } });
    findUser.mockResolvedValue({ activeHouseholdId: "house-2" });
    findFirst.mockResolvedValue(membership);

    await expect(requireMembership()).resolves.toBe(membership);
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", householdId: "house-2" },
      include: { household: true, user: true },
      orderBy: { joinedAt: "asc" },
    });
  });
});
