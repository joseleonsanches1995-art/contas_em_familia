import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formData } from "../helpers/entry";

const requireMembership = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const categoryFind = vi.hoisted(() => vi.fn());
const entryFind = vi.hoisted(() => vi.fn());
const entryCreate = vi.hoisted(() => vi.fn());
const entryUpdate = vi.hoisted(() => vi.fn());
const logCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ requireMembership }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findFirst: categoryFind },
    financialEntry: { findFirst: entryFind, create: entryCreate, update: entryUpdate },
    activityLog: { create: logCreate },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

import { Prisma } from "@/generated/prisma/client";
import { createEntry, deleteEntry, markPaid, restoreEntry, updateEntry } from "@/actions/entries";

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const membership = { householdId: "house-1", userId: "user-1" };

function launch(overrides: Record<string, string> = {}) {
  return formData({
    type: "expense",
    description: "Internet",
    amount: "120,00",
    categoryId: CATEGORY,
    dueDate: "2026-11-08",
    notes: "",
    ...overrides,
  });
}

describe("novo lançamento", () => {
  beforeEach(() => {
    requireMembership.mockResolvedValue(membership);
    categoryFind.mockResolvedValue({ id: CATEGORY });
    entryCreate.mockResolvedValue({ id: "entry-1", description: "Internet" });
  });

  it("recusa descrição, categoria, data e valor inválidos", async () => {
    await expect(createEntry({}, launch({ description: " " }))).resolves.toEqual({
      error: "Informe uma descrição.",
    });
    await expect(createEntry({}, launch({ categoryId: "moradia" }))).resolves.toEqual({
      error: "Escolha uma categoria.",
    });
    await expect(createEntry({}, launch({ dueDate: "08/11/2026" }))).resolves.toEqual({
      error: "Informe o vencimento.",
    });
    await expect(createEntry({}, launch({ amount: "0" }))).resolves.toEqual({
      error: "Informe um valor maior que zero, com até duas casas.",
    });
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("não aceita categoria de outro espaço", async () => {
    categoryFind.mockResolvedValue(null);
    await expect(createEntry({}, launch())).resolves.toEqual({
      error: "Categoria inválida para este espaço.",
    });
    expect(categoryFind).toHaveBeenCalledWith({
      where: { id: CATEGORY, householdId: "house-1" },
    });
  });

  it("grava despesa no espaço da sessão, com competência igual ao vencimento", async () => {
    await expect(createEntry({}, launch({ notes: "  fibra  " }))).rejects.toThrow(
      "NEXT_REDIRECT:/contas?mes=2026-11",
    );

    expect(entryCreate).toHaveBeenCalledWith({
      data: {
        householdId: "house-1",
        categoryId: CATEGORY,
        type: "expense",
        description: "Internet",
        amount: "120.00",
        dueDate: new Date("2026-11-08T00:00:00.000Z"),
        competenceDate: new Date("2026-11-08T00:00:00.000Z"),
        notes: "fibra",
        createdById: "user-1",
      },
    });
    expect(logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "created",
        entityId: "entry-1",
        householdId: "house-1",
        userId: "user-1",
      }),
    });
    for (const path of ["/", "/contas", "/agenda", "/analises", "/historico"]) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it("grava receita quando o tipo é receita e omite observação vazia", async () => {
    entryCreate.mockResolvedValue({ id: "entry-2", description: "Salário" });
    await expect(
      createEntry({}, launch({ type: "income", description: "Salário", amount: "6.500,00" })),
    ).rejects.toThrow("NEXT_REDIRECT:/contas?mes=2026-11");

    expect(entryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "income",
        description: "Salário",
        amount: "6500.00",
        notes: null,
      }),
    });
  });
});

const ENTRY_ID = "33333333-3333-4333-8333-333333333333";

function storedEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    type: "expense",
    description: "Internet",
    amount: new Prisma.Decimal("120.00"),
    dueDate: new Date("2026-11-08T00:00:00.000Z"),
    notes: null,
    category: { name: "Moradia" },
    ...overrides,
  };
}

describe("edição", () => {
  beforeEach(() => {
    requireMembership.mockResolvedValue(membership);
    categoryFind.mockResolvedValue({ id: CATEGORY, name: "Moradia" });
    entryFind.mockResolvedValue(storedEntry());
  });

  it("recusa lançamento inexistente e categoria de outro espaço", async () => {
    await expect(updateEntry({}, launch({ id: "internet" }))).resolves.toEqual({
      error: "Lançamento não encontrado.",
    });
    expect(entryFind).not.toHaveBeenCalled();

    entryFind.mockResolvedValue(null);
    await expect(updateEntry({}, launch({ id: ENTRY_ID }))).resolves.toEqual({
      error: "Lançamento não encontrado.",
    });

    entryFind.mockResolvedValue(storedEntry());
    categoryFind.mockResolvedValue(null);
    await expect(updateEntry({}, launch({ id: ENTRY_ID, description: "Fibra" }))).resolves.toEqual({
      error: "Categoria inválida para este espaço.",
    });
    expect(entryUpdate).not.toHaveBeenCalled();
  });

  it("não grava nem registra quando nada mudou", async () => {
    await expect(updateEntry({}, launch({ id: ENTRY_ID }))).resolves.toEqual({
      error: "Nada mudou neste lançamento.",
    });
    expect(entryUpdate).not.toHaveBeenCalled();
    expect(logCreate).not.toHaveBeenCalled();
  });

  it("atualiza o lançamento e descreve a mudança no histórico", async () => {
    await expect(
      updateEntry({}, launch({ id: ENTRY_ID, amount: "150,00", description: "Fibra" })),
    ).rejects.toThrow("NEXT_REDIRECT:/contas?mes=2026-11");

    expect(entryUpdate).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: expect.objectContaining({
        description: "Fibra",
        amount: "150.00",
        competenceDate: new Date("2026-11-08T00:00:00.000Z"),
      }),
    });
    expect(logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "updated",
        entityId: ENTRY_ID,
        userId: "user-1",
        description: expect.stringContaining('descrição de "Internet" para "Fibra"'),
      }),
    });
  });
});

describe("exclusão e restauração", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T18:30:00.000Z"));
    requireMembership.mockResolvedValue(membership);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não apaga lançamento de outro espaço", async () => {
    entryFind.mockResolvedValue(null);
    await deleteEntry(formData({ id: ENTRY_ID }));
    expect(entryUpdate).not.toHaveBeenCalled();
  });

  it("marca a exclusão e registra quem excluiu, sem sair da tela", async () => {
    entryFind.mockResolvedValue(storedEntry());
    await deleteEntry(formData({ id: ENTRY_ID, next: "https://fora.test" }));

    expect(entryUpdate).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { deletedAt: new Date("2026-11-05T18:30:00.000Z") },
    });
    expect(logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "deleted",
        userId: "user-1",
        description: expect.stringContaining('Excluiu a despesa "Internet"'),
      }),
    });
  });

  it("volta para o histórico quando a exclusão parte da edição", async () => {
    entryFind.mockResolvedValue(storedEntry());
    await expect(deleteEntry(formData({ id: ENTRY_ID, next: "/historico" }))).rejects.toThrow(
      "NEXT_REDIRECT:/historico",
    );
  });

  it("restaura só o que está excluído e registra quem restaurou", async () => {
    entryFind.mockResolvedValue(null);
    await restoreEntry(formData({ id: ENTRY_ID }));
    expect(entryUpdate).not.toHaveBeenCalled();

    entryFind.mockResolvedValue(storedEntry({ type: "income", description: "Salário" }));
    await restoreEntry(formData({ id: ENTRY_ID }));
    expect(entryUpdate).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { deletedAt: null },
    });
    expect(logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "restored",
        description: 'Restaurou a receita "Salário".',
        userId: "user-1",
      }),
    });
  });
});

describe("pagamento", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T18:30:00.000Z"));
    requireMembership.mockResolvedValue(membership);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não altera lançamento de outro espaço ou que já não está pendente", async () => {
    entryFind.mockResolvedValue(null);
    await markPaid(formData({ id: "entry-1" }));
    expect(entryFind).toHaveBeenCalledWith({
      where: {
        id: "entry-1",
        householdId: "house-1",
        deletedAt: null,
        status: "pending",
      },
    });
    expect(entryUpdate).not.toHaveBeenCalled();
  });

  it("marca como pago na data civil de Brasília e registra quem pagou", async () => {
    entryFind.mockResolvedValue({ id: "entry-1", description: "Internet" });
    await markPaid(formData({ id: "entry-1" }));

    expect(entryUpdate).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: {
        status: "paid",
        paidAt: new Date("2026-11-05T18:30:00.000Z"),
        paidOn: new Date("2026-11-05T00:00:00.000Z"),
      },
    });
    expect(logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "paid",
        description: "Pagamento registrado: Internet",
        userId: "user-1",
      }),
    });
  });
});
