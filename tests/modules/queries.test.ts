import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { entry } from "../helpers/entry";

const prisma = vi.hoisted(() => ({
  financialEntry: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
  activityLog: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  expensesByCategory,
  getAgenda,
  getCategories,
  getChangeHistory,
  getEntriesUntilMonth,
  getMonthEntries,
  rollForward,
  shareWidth,
  summarize,
} from "@/modules/financial-entries/queries";

describe("resumo do mês", () => {
  it("separa receita, despesa paga, pendente e saldo previsto", () => {
    const totals = summarize([
      entry({ id: "1", type: "income", amount: new Prisma.Decimal("6500.00"), status: "paid" }),
      entry({ id: "2", type: "expense", amount: new Prisma.Decimal("1200.00"), status: "paid" }),
      entry({ id: "3", type: "expense", amount: new Prisma.Decimal("1850.00"), status: "pending" }),
    ]);

    expect(totals.income.toFixed(2)).toBe("6500.00");
    expect(totals.expense.toFixed(2)).toBe("3050.00");
    expect(totals.paid.toFixed(2)).toBe("1200.00");
    expect(totals.pending.toFixed(2)).toBe("1850.00");
    expect(totals.predicted.toFixed(2)).toBe("3450.00");
  });

  it("não coloca receita em a pagar nem em já pago", () => {
    const totals = summarize([
      entry({ type: "income", amount: new Prisma.Decimal("100.00"), status: "pending" }),
    ]);
    expect(totals.pending.toFixed(2)).toBe("0.00");
    expect(totals.paid.toFixed(2)).toBe("0.00");
    expect(totals.predicted.toFixed(2)).toBe("100.00");
  });
});

describe("saldo que atravessa os meses", () => {
  const october = new Date("2026-10-10T00:00:00.000Z");
  const november = new Date("2026-11-08T00:00:00.000Z");

  const history = [
    entry({
      id: "income-old",
      type: "income",
      description: "Salário de outubro",
      amount: new Prisma.Decimal("1000.00"),
      status: "paid",
      competenceDate: october,
      dueDate: october,
    }),
    entry({
      id: "paid-old",
      description: "Aluguel",
      amount: new Prisma.Decimal("400.00"),
      status: "paid",
      competenceDate: october,
      dueDate: october,
    }),
    entry({
      id: "open-old",
      description: "Internet antiga",
      amount: new Prisma.Decimal("100.00"),
      status: "pending",
      competenceDate: october,
      dueDate: october,
    }),
    entry({
      id: "income-now",
      type: "income",
      description: "Salário de novembro",
      amount: new Prisma.Decimal("200.00"),
      status: "paid",
      competenceDate: november,
      dueDate: november,
    }),
    entry({
      id: "expense-now",
      description: "Energia",
      amount: new Prisma.Decimal("50.00"),
      status: "pending",
      competenceDate: november,
      dueDate: november,
    }),
  ];

  it("soma o que veio antes e separa o mês em tela", () => {
    const snapshot = rollForward(history, "2026-11");

    expect(snapshot.monthIncome.toFixed(2)).toBe("200.00");
    expect(snapshot.totalIncome.toFixed(2)).toBe("1200.00");
    expect(snapshot.priorExpenses.toFixed(2)).toBe("500.00");
    expect(snapshot.monthExpenses.toFixed(2)).toBe("50.00");
    expect(snapshot.predicted.toFixed(2)).toBe("650.00");
    expect(snapshot.pending.toFixed(2)).toBe("150.00");
    expect(snapshot.paid.toFixed(2)).toBe("0.00");
    expect(snapshot.carriedUnpaid.map((item) => item.id)).toEqual(["open-old"]);
    expect(snapshot.monthEntries.map((item) => item.id)).toEqual(["income-now", "expense-now"]);
  });

  it("não puxa lançamento de um mês que ainda não chegou", () => {
    const snapshot = rollForward(history, "2026-10");

    expect(snapshot.totalIncome.toFixed(2)).toBe("1000.00");
    expect(snapshot.monthExpenses.toFixed(2)).toBe("500.00");
    expect(snapshot.priorExpenses.toFixed(2)).toBe("0.00");
    expect(snapshot.predicted.toFixed(2)).toBe("500.00");
    expect(snapshot.carriedUnpaid).toEqual([]);
    expect(snapshot.monthEntries.map((item) => item.id)).toEqual([
      "income-old",
      "paid-old",
      "open-old",
    ]);
  });

  it("busca tudo até o fim do mês escolhido", async () => {
    prisma.financialEntry.findMany.mockResolvedValue([]);
    await getEntriesUntilMonth("house-1", "2026-11");

    expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdId: "house-1",
          deletedAt: null,
          status: { not: "canceled" },
          competenceDate: { lt: new Date("2026-12-01T00:00:00.000Z") },
        },
      }),
    );
  });
});

describe("despesas por categoria", () => {
  it("soma a categoria, ignora receita e ordena da maior para a menor", () => {
    const rows = expensesByCategory([
      entry({ id: "1", amount: new Prisma.Decimal("80.00"), category: { ...entry().category!, name: "Alimentação" } }),
      entry({ id: "2", amount: new Prisma.Decimal("20.00"), category: { ...entry().category!, name: "Alimentação" } }),
      entry({ id: "3", amount: new Prisma.Decimal("200.00") }),
      entry({ id: "4", type: "income", amount: new Prisma.Decimal("900.00") }),
      entry({ id: "5", amount: new Prisma.Decimal("15.00"), category: null, categoryId: null }),
    ]);

    expect(rows.map((row) => [row.name, row.amount.toFixed(2)])).toEqual([
      ["Moradia", "200.00"],
      ["Alimentação", "100.00"],
      ["Sem categoria", "15.00"],
    ]);
  });

  it("dá largura mínima para a fatia pequena e zero quando não há máximo", () => {
    const max = new Prisma.Decimal("200.00");
    expect(shareWidth(new Prisma.Decimal("200.00"), max)).toBe(100);
    expect(shareWidth(new Prisma.Decimal("1.00"), max)).toBe(8);
    expect(shareWidth(new Prisma.Decimal("1.00"), new Prisma.Decimal(0))).toBe(0);
  });
});

describe("consultas do espaço", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtra o mês pela competência e esconde cancelados e excluídos", async () => {
    prisma.financialEntry.findMany.mockResolvedValue([]);
    await getMonthEntries("house-1", "2026-11");

    expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdId: "house-1",
          deletedAt: null,
          status: { not: "canceled" },
          competenceDate: {
            gte: new Date("2026-11-01T00:00:00.000Z"),
            lt: new Date("2026-12-01T00:00:00.000Z"),
          },
        },
        orderBy: [{ dueDate: "asc" }, { description: "asc" }],
      }),
    );
  });

  it("separa vencidas e próximas pela data de hoje", async () => {
    prisma.financialEntry.findMany.mockResolvedValue([]);
    const agenda = await getAgenda("house-1");

    expect(agenda.today.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(prisma.financialEntry.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          householdId: "house-1",
          deletedAt: null,
          status: "pending",
          dueDate: { lt: agenda.today },
        },
      }),
    );
    expect(prisma.financialEntry.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          householdId: "house-1",
          deletedAt: null,
          status: "pending",
          dueDate: { gte: agenda.today },
        },
        take: 12,
      }),
    );
  });

  it("lista categorias do espaço na ordem cadastrada", async () => {
    prisma.category.findMany.mockResolvedValue([]);
    await getCategories("house-1");
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { householdId: "house-1" },
      orderBy: { sortOrder: "asc" },
    });
  });
});

describe("histórico de alterações", () => {
  it("libera restauração só na exclusão mais recente que ainda está apagada", async () => {
    const user = { name: "Ana Souza" };
    prisma.activityLog.findMany.mockResolvedValue([
      { id: "log-new", action: "deleted", entityId: "entry-1", user, description: "nova" },
      { id: "log-edit", action: "updated", entityId: "entry-2", user, description: "edição" },
      { id: "log-old", action: "deleted", entityId: "entry-1", user, description: "antiga" },
      { id: "log-gone", action: "deleted", entityId: "entry-3", user, description: "já restaurada" },
    ]);
    prisma.financialEntry.findMany.mockResolvedValue([{ id: "entry-1" }]);

    const history = await getChangeHistory("house-1");

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdId: "house-1",
          entityType: "financial_entry",
          action: { in: ["updated", "deleted", "restored"] },
        },
      }),
    );
    expect(history.map((item) => [item.id, item.canRestore])).toEqual([
      ["log-new", true],
      ["log-edit", false],
      ["log-old", false],
      ["log-gone", false],
    ]);
  });
});
