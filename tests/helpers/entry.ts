import { Prisma } from "@/generated/prisma/client";
import type { EntryWithRelations } from "@/modules/financial-entries/queries";

export function entry(
  overrides: Partial<EntryWithRelations> = {},
): EntryWithRelations {
  return {
    id: "entry-1",
    householdId: "house-1",
    categoryId: "cat-1",
    recurrenceId: null,
    installmentPlanId: null,
    type: "expense",
    description: "Internet",
    amount: new Prisma.Decimal("120.00"),
    dueDate: new Date(Date.UTC(2026, 10, 5)),
    competenceDate: new Date(Date.UTC(2026, 10, 5)),
    status: "pending",
    paidAt: null,
    paidOn: null,
    installmentNumber: null,
    notes: null,
    createdById: "user-1",
    createdAt: new Date("2026-11-05T12:00:00.000Z"),
    updatedAt: new Date("2026-11-05T12:00:00.000Z"),
    deletedAt: null,
    category: {
      id: "cat-1",
      householdId: "house-1",
      name: "Moradia",
      sortOrder: 0,
      createdAt: new Date("2026-11-01T12:00:00.000Z"),
    },
    creator: { name: "Ana Souza" },
    ...overrides,
  } as EntryWithRelations;
}

export function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
