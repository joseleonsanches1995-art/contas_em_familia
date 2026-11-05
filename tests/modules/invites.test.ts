import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  householdMember: { findUnique: vi.fn(), upsert: vi.fn() },
  householdInvite: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  activityLog: { create: vi.fn() },
  $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { acceptInvite, inviteMember, switchHousehold } from "@/modules/households/invites";

const input = {
  householdId: "house-1",
  invitedById: "user-1",
  inviterEmail: "ana@familia.com",
};

describe("convite para o espaço", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.householdMember.findUnique.mockResolvedValue(null);
    prisma.householdInvite.findFirst.mockResolvedValue(null);
    prisma.householdInvite.create.mockResolvedValue({ id: "invite-1" });
  });

  it("recusa e-mail inválido, o próprio e-mail, quem já participa e convite repetido", async () => {
    await expect(inviteMember({ ...input, email: "esposa" })).resolves.toEqual({
      error: "Informe um e-mail válido.",
    });
    await expect(inviteMember({ ...input, email: "Ana@familia.com" })).resolves.toEqual({
      error: "Você já está neste espaço.",
    });

    prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
    prisma.householdMember.findUnique.mockResolvedValue({ id: "member-2" });
    await expect(inviteMember({ ...input, email: "esposa@familia.com" })).resolves.toEqual({
      error: "Esta pessoa já está neste espaço.",
    });

    prisma.householdMember.findUnique.mockResolvedValue(null);
    prisma.householdInvite.findFirst.mockResolvedValue({ id: "invite-1" });
    await expect(inviteMember({ ...input, email: "esposa@familia.com" })).resolves.toEqual({
      error: "Já existe um convite pendente para este e-mail.",
    });
    expect(prisma.householdInvite.create).not.toHaveBeenCalled();
  });

  it("grava o convite para quem já tem login ou ainda vai criar", async () => {
    await expect(inviteMember({ ...input, email: " Esposa@Familia.com " })).resolves.toEqual({
      email: "esposa@familia.com",
    });

    expect(prisma.householdInvite.create).toHaveBeenCalledWith({
      data: {
        householdId: "house-1",
        email: "esposa@familia.com",
        invitedById: "user-1",
      },
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "invited",
        description: "Convidou esposa@familia.com para o espaço.",
      }),
    });
  });
});

describe("aceite do convite", () => {
  it("não aceita convite de outro e-mail", async () => {
    prisma.householdInvite.findFirst.mockResolvedValue(null);
    await expect(
      acceptInvite({
        userId: "user-2",
        email: "outra@familia.com",
        name: "Outra",
        inviteId: "invite-1",
      }),
    ).resolves.toEqual({ error: "Convite não encontrado." });
    expect(prisma.householdMember.upsert).not.toHaveBeenCalled();
  });

  it("entra no espaço de quem convidou e passa a abri-lo", async () => {
    prisma.householdInvite.findFirst.mockResolvedValue({
      id: "invite-1",
      householdId: "house-1",
      email: "esposa@familia.com",
    });

    await acceptInvite({
      userId: "user-2",
      email: "esposa@familia.com",
      name: "Maria",
      inviteId: "invite-1",
    });

    expect(prisma.householdMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { householdId: "house-1", userId: "user-2", role: "owner" },
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { activeHouseholdId: "house-1" },
    });
    expect(prisma.householdInvite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: expect.objectContaining({ status: "accepted" }),
    });
  });
});

describe("troca de espaço", () => {
  it("só abre um espaço do qual a pessoa participa", async () => {
    prisma.householdMember.findUnique.mockResolvedValue(null);
    await expect(switchHousehold({ userId: "user-2", householdId: "house-9" })).resolves.toEqual({
      error: "Você não participa deste espaço.",
    });

    prisma.householdMember.findUnique.mockResolvedValue({ id: "member-2" });
    await switchHousehold({ userId: "user-2", householdId: "house-1" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { activeHouseholdId: "house-1" },
    });
  });
});
