import { z } from "zod";
import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function inviteMember(input: {
  householdId: string;
  invitedById: string;
  inviterEmail: string;
  email: string;
}) {
  const email = normalizeEmail(input.email);
  if (!z.email().safeParse(email).success) return { error: "Informe um e-mail válido." };
  if (email === normalizeEmail(input.inviterEmail)) {
    return { error: "Você já está neste espaço." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const member = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: { householdId: input.householdId, userId: existingUser.id },
      },
    });
    if (member) return { error: "Esta pessoa já está neste espaço." };
  }

  const pending = await prisma.householdInvite.findFirst({
    where: { householdId: input.householdId, email, status: "pending" },
  });
  if (pending) return { error: "Já existe um convite pendente para este e-mail." };

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: input.householdId,
      email,
      invitedById: input.invitedById,
    },
  });

  await prisma.activityLog.create({
    data: {
      householdId: input.householdId,
      userId: input.invitedById,
      entityType: "household_invite",
      entityId: invite.id,
      action: "invited",
      description: `Convidou ${email} para o espaço.`,
    },
  });

  return { email };
}

export async function acceptInvite(input: { userId: string; email: string; name: string; inviteId: string }) {
  const invite = await prisma.householdInvite.findFirst({
    where: {
      id: input.inviteId,
      email: normalizeEmail(input.email),
      status: "pending",
    },
  });
  if (!invite) return { error: "Convite não encontrado." };

  const now = new Date();
  await prisma.$transaction([
    prisma.householdMember.upsert({
      where: {
        householdId_userId: { householdId: invite.householdId, userId: input.userId },
      },
      create: { householdId: invite.householdId, userId: input.userId, role: "owner" },
      update: {},
    }),
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", respondedAt: now },
    }),
    prisma.user.update({
      where: { id: input.userId },
      data: { activeHouseholdId: invite.householdId },
    }),
    prisma.activityLog.create({
      data: {
        householdId: invite.householdId,
        userId: input.userId,
        entityType: "household_invite",
        entityId: invite.id,
        action: "accepted",
        description: `${input.name} entrou no espaço.`,
      },
    }),
  ]);

  return { householdId: invite.householdId };
}

export async function declineInvite(input: { userId: string; email: string; inviteId: string }) {
  const invite = await prisma.householdInvite.findFirst({
    where: {
      id: input.inviteId,
      email: normalizeEmail(input.email),
      status: "pending",
    },
  });
  if (!invite) return { error: "Convite não encontrado." };

  await prisma.$transaction([
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { status: "declined", respondedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        householdId: invite.householdId,
        userId: input.userId,
        entityType: "household_invite",
        entityId: invite.id,
        action: "declined",
        description: `${input.email} recusou o convite.`,
      },
    }),
  ]);

  return {};
}

export async function revokeInvite(input: { householdId: string; userId: string; inviteId: string }) {
  const invite = await prisma.householdInvite.findFirst({
    where: { id: input.inviteId, householdId: input.householdId, status: "pending" },
  });
  if (!invite) return { error: "Convite não encontrado." };

  await prisma.$transaction([
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { status: "revoked", respondedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        householdId: input.householdId,
        userId: input.userId,
        entityType: "household_invite",
        entityId: invite.id,
        action: "revoked",
        description: `Cancelou o convite para ${invite.email}.`,
      },
    }),
  ]);

  return {};
}

export async function switchHousehold(input: { userId: string; householdId: string }) {
  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: { householdId: input.householdId, userId: input.userId },
    },
  });
  if (!membership) return { error: "Você não participa deste espaço." };

  await prisma.user.update({
    where: { id: input.userId },
    data: { activeHouseholdId: input.householdId },
  });
  return {};
}

const inviteInclude = {
  household: { select: { name: true } },
  invitedBy: { select: { name: true } },
} as const;

export async function getReceivedInvites(email: string) {
  return prisma.householdInvite.findMany({
    where: { email: normalizeEmail(email), status: "pending" },
    include: inviteInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getFamilyPage(householdId: string, userId: string) {
  const [members, sentInvites, spaces] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.householdInvite.findMany({
      where: { householdId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.householdMember.findMany({
      where: { userId },
      include: { household: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return { members, sentInvites, spaces };
}
