import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { brazilToday, monthRange, parseMonthKey } from "@/lib/dates";
import { sumAmounts } from "@/lib/money";

const entryInclude = {
  category: true,
  creator: { select: { name: true } },
} satisfies Prisma.FinancialEntryInclude;

export type EntryWithRelations = Prisma.FinancialEntryGetPayload<{
  include: typeof entryInclude;
}>;

export async function getMonthEntries(householdId: string, monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const { start, end } = monthRange(year, month);

  return prisma.financialEntry.findMany({
    where: {
      householdId,
      deletedAt: null,
      status: { not: "canceled" },
      competenceDate: { gte: start, lt: end },
    },
    include: entryInclude,
    orderBy: [{ dueDate: "asc" }, { description: "asc" }],
  });
}

export async function getEntriesUntilMonth(householdId: string, monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const { end } = monthRange(year, month);

  return prisma.financialEntry.findMany({
    where: {
      householdId,
      deletedAt: null,
      status: { not: "canceled" },
      competenceDate: { lt: end },
    },
    include: entryInclude,
    orderBy: [{ competenceDate: "asc" }, { dueDate: "asc" }, { description: "asc" }],
  });
}

export function rollForward(entries: EntryWithRelations[], monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const { start, end } = monthRange(year, month);
  const visible = entries.filter((item) => item.competenceDate < end);
  const inMonth = (item: EntryWithRelations) => item.competenceDate >= start;
  const beforeMonth = (item: EntryWithRelations) => item.competenceDate < start;

  const monthEntries = visible.filter(inMonth);
  const carriedUnpaid = visible.filter(
    (item) => beforeMonth(item) && item.status === "pending",
  );
  const monthIncome = sumAmounts(
    monthEntries.filter((item) => item.type === "income").map((item) => item.amount),
  );
  const totalIncome = sumAmounts(
    visible.filter((item) => item.type === "income").map((item) => item.amount),
  );
  const priorExpenses = sumAmounts(
    visible.filter((item) => item.type === "expense" && beforeMonth(item)).map((item) => item.amount),
  );
  const monthExpenses = sumAmounts(
    monthEntries.filter((item) => item.type === "expense").map((item) => item.amount),
  );
  const pending = sumAmounts(
    visible
      .filter((item) => item.type === "expense" && item.status === "pending")
      .map((item) => item.amount),
  );
  const paid = sumAmounts(
    monthEntries
      .filter((item) => item.type === "expense" && item.status === "paid")
      .map((item) => item.amount),
  );

  return {
    monthEntries,
    carriedUnpaid,
    monthIncome,
    totalIncome,
    priorExpenses,
    monthExpenses,
    pending,
    paid,
    predicted: totalIncome.minus(priorExpenses).minus(monthExpenses),
  };
}

export async function getAgenda(householdId: string) {
  const today = brazilToday();
  const base = {
    householdId,
    deletedAt: null,
    status: "pending" as const,
  };

  const [overdue, upcoming] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { ...base, dueDate: { lt: today } },
      include: entryInclude,
      orderBy: { dueDate: "asc" },
    }),
    prisma.financialEntry.findMany({
      where: { ...base, dueDate: { gte: today } },
      include: entryInclude,
      orderBy: { dueDate: "asc" },
      take: 12,
    }),
  ]);

  return { overdue, upcoming, today };
}

export function summarize(entries: EntryWithRelations[]) {
  const income = sumAmounts(
    entries.filter((entry) => entry.type === "income").map((entry) => entry.amount),
  );
  const expenses = entries.filter((entry) => entry.type === "expense");
  const expense = sumAmounts(expenses.map((entry) => entry.amount));
  const paid = sumAmounts(
    expenses.filter((entry) => entry.status === "paid").map((entry) => entry.amount),
  );
  const pending = sumAmounts(
    expenses.filter((entry) => entry.status === "pending").map((entry) => entry.amount),
  );

  return {
    income,
    expense,
    paid,
    pending,
    predicted: income.minus(expense),
  };
}

export async function getEditableEntry(householdId: string, id: string) {
  return prisma.financialEntry.findFirst({
    where: { id, householdId, deletedAt: null },
    include: entryInclude,
  });
}

export async function getChangeHistory(householdId: string) {
  const logs = await prisma.activityLog.findMany({
    where: {
      householdId,
      entityType: "financial_entry",
      action: { in: ["updated", "deleted", "restored"] },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const newestDelete = new Map<string, string>();
  for (const log of logs) {
    if (log.action === "deleted" && !newestDelete.has(log.entityId)) {
      newestDelete.set(log.entityId, log.id);
    }
  }

  const stillDeleted =
    newestDelete.size === 0
      ? []
      : await prisma.financialEntry.findMany({
          where: {
            householdId,
            deletedAt: { not: null },
            id: { in: [...newestDelete.keys()] },
          },
          select: { id: true },
        });
  const deletedIds = new Set(stillDeleted.map((item) => item.id));
  const restorable = new Set(
    [...newestDelete.entries()]
      .filter(([entryId]) => deletedIds.has(entryId))
      .map(([, logId]) => logId),
  );

  return logs.map((log) => ({ ...log, canRestore: restorable.has(log.id) }));
}

export async function getCategories(householdId: string) {
  return prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });
}

export function expensesByCategory(entries: EntryWithRelations[]) {
  const totals = new Map<string, Prisma.Decimal>();

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const name = entry.category?.name ?? "Sem categoria";
    totals.set(name, (totals.get(name) ?? new Prisma.Decimal(0)).plus(entry.amount));
  }

  return [...totals.entries()]
    .sort((left, right) => right[1].comparedTo(left[1]))
    .map(([name, amount]) => ({ name, amount }));
}

export function shareWidth(amount: Prisma.Decimal, max: Prisma.Decimal): number {
  if (max.isZero()) return 0;
  return Math.max(8, Number(amount.dividedBy(max).times(100).toFixed(0)));
}
