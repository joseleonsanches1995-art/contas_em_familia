"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { brazilToday, dateOnly, toIsoDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/session";
import {
  describeEntryChange,
  describeEntryRemoval,
  describeEntryRestore,
} from "@/modules/financial-entries/changes";

export type EntryState = { error?: string };

const entrySchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(2, "Informe uma descrição.").max(120),
  amount: z.string().min(1),
  categoryId: z.uuid("Escolha uma categoria."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento."),
  notes: z.string().trim().max(280).optional(),
});

export async function createEntry(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const membership = await requireMembership();
  const parsed = parseEntryForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const category = await findHouseholdCategory(membership.householdId, parsed.data.categoryId);
  if (!category) return { error: "Categoria inválida para este espaço." };

  const dueDate = dateOnly(parsed.data.dueDate);
  const notes = parsed.data.notes ? parsed.data.notes : null;

  const entry = await prisma.financialEntry.create({
    data: {
      householdId: membership.householdId,
      categoryId: category.id,
      type: parsed.data.type,
      description: parsed.data.description,
      amount: parsed.data.amount,
      dueDate,
      competenceDate: dueDate,
      notes,
      createdById: membership.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      householdId: membership.householdId,
      userId: membership.userId,
      entityType: "financial_entry",
      entityId: entry.id,
      action: "created",
      description: `Lançamento criado: ${entry.description}`,
    },
  });

  revalidateFinancialPaths();
  redirect(`/contas?mes=${toIsoDate(dueDate).slice(0, 7)}`);
}

export async function updateEntry(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const membership = await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return { error: "Lançamento não encontrado." };

  const parsed = parseEntryForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const entry = await prisma.financialEntry.findFirst({
    where: { id, householdId: membership.householdId, deletedAt: null },
    include: { category: true },
  });
  if (!entry) return { error: "Lançamento não encontrado." };

  const category = await findHouseholdCategory(membership.householdId, parsed.data.categoryId);
  if (!category) return { error: "Categoria inválida para este espaço." };

  const dueDate = dateOnly(parsed.data.dueDate);
  const notes = parsed.data.notes ? parsed.data.notes : null;
  const summary = describeEntryChange(
    {
      type: entry.type,
      description: entry.description,
      amount: entry.amount.toFixed(2),
      categoryName: entry.category?.name ?? "Sem categoria",
      dueDate: toIsoDate(entry.dueDate),
      notes: entry.notes,
    },
    {
      type: parsed.data.type,
      description: parsed.data.description,
      amount: parsed.data.amount,
      categoryName: category.name,
      dueDate: parsed.data.dueDate,
      notes,
    },
  );
  if (!summary) return { error: "Nada mudou neste lançamento." };

  await prisma.$transaction([
    prisma.financialEntry.update({
      where: { id: entry.id },
      data: {
        type: parsed.data.type,
        description: parsed.data.description,
        amount: parsed.data.amount,
        categoryId: category.id,
        dueDate,
        competenceDate: dueDate,
        notes,
      },
    }),
    prisma.activityLog.create({
      data: {
        householdId: membership.householdId,
        userId: membership.userId,
        entityType: "financial_entry",
        entityId: entry.id,
        action: "updated",
        description: summary,
      },
    }),
  ]);

  revalidateFinancialPaths();
  redirect(`/contas?mes=${parsed.data.dueDate.slice(0, 7)}`);
}

export async function deleteEntry(formData: FormData) {
  const membership = await requireMembership();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");

  const entry = await prisma.financialEntry.findFirst({
    where: { id, householdId: membership.householdId, deletedAt: null },
  });
  if (!entry) return;

  await prisma.$transaction([
    prisma.financialEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        householdId: membership.householdId,
        userId: membership.userId,
        entityType: "financial_entry",
        entityId: entry.id,
        action: "deleted",
        description: describeEntryRemoval({
          type: entry.type,
          description: entry.description,
          amount: entry.amount.toFixed(2),
        }),
      },
    }),
  ]);

  revalidateFinancialPaths();
  if (isLocalPath(next)) redirect(next);
}

export async function restoreEntry(formData: FormData) {
  const membership = await requireMembership();
  const id = String(formData.get("id") ?? "");

  const entry = await prisma.financialEntry.findFirst({
    where: { id, householdId: membership.householdId, deletedAt: { not: null } },
  });
  if (!entry) return;

  await prisma.$transaction([
    prisma.financialEntry.update({
      where: { id: entry.id },
      data: { deletedAt: null },
    }),
    prisma.activityLog.create({
      data: {
        householdId: membership.householdId,
        userId: membership.userId,
        entityType: "financial_entry",
        entityId: entry.id,
        action: "restored",
        description: describeEntryRestore({
          type: entry.type,
          description: entry.description,
        }),
      },
    }),
  ]);

  revalidateFinancialPaths();
}

export async function markPaid(formData: FormData) {
  const membership = await requireMembership();
  const id = String(formData.get("id") ?? "");
  const today = brazilToday();

  const entry = await prisma.financialEntry.findFirst({
    where: {
      id,
      householdId: membership.householdId,
      deletedAt: null,
      status: "pending",
    },
  });

  if (!entry) return;

  await prisma.$transaction([
    prisma.financialEntry.update({
      where: { id: entry.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        paidOn: today,
      },
    }),
    prisma.activityLog.create({
      data: {
        householdId: membership.householdId,
        userId: membership.userId,
        entityType: "financial_entry",
        entityId: entry.id,
        action: "paid",
        description: `Pagamento registrado: ${entry.description}`,
      },
    }),
  ]);

  revalidateFinancialPaths();
}

type ParsedEntry = {
  ok: true;
  data: {
    type: "income" | "expense";
    description: string;
    amount: string;
    categoryId: string;
    dueDate: string;
    notes?: string;
  };
};

function parseEntryForm(formData: FormData): ParsedEntry | { ok: false; error: string } {
  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    dueDate: formData.get("dueDate"),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o lançamento." };
  }

  const amount = parseAmount(parsed.data.amount);
  if (!amount) {
    return { ok: false, error: "Informe um valor maior que zero, com até duas casas." };
  }

  return { ok: true, data: { ...parsed.data, amount } };
}

function findHouseholdCategory(householdId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, householdId },
  });
}

function isLocalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function revalidateFinancialPaths() {
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/agenda");
  revalidatePath("/analises");
  revalidatePath("/historico");
}
