import { describe, expect, it } from "vitest";
import { formatBRL } from "@/lib/money";
import {
  describeEntryChange,
  describeEntryRemoval,
  describeEntryRestore,
  type EntrySnapshot,
} from "@/modules/financial-entries/changes";

const before: EntrySnapshot = {
  type: "expense",
  description: "Internet",
  amount: "120.00",
  categoryName: "Moradia",
  dueDate: "2026-11-08",
  notes: null,
};

describe("texto da alteração", () => {
  it("não descreve lançamento idêntico", () => {
    expect(describeEntryChange(before, { ...before })).toBeNull();
    expect(describeEntryChange(before, { ...before, notes: "  " })).toBeNull();
  });

  it("junta cada campo que mudou", () => {
    const summary = describeEntryChange(before, {
      ...before,
      type: "income",
      description: "Salário",
      amount: "6500.00",
      categoryName: "Outros",
      dueDate: "2026-12-05",
      notes: "depósito",
    });

    expect(summary).toBe(
      [
        'Editou "Internet":',
        "tipo de despesa para receita;",
        'descrição de "Internet" para "Salário";',
        `valor de ${formatBRL("120.00")} para ${formatBRL("6500.00")};`,
        "categoria de Moradia para Outros;",
        "vencimento de 08/11/2026 para 05/12/2026;",
        'observação de "nenhuma" para "depósito".',
      ].join(" "),
    );
  });

  it("nomeia exclusão e restauração pelo tipo", () => {
    expect(describeEntryRemoval(before)).toContain('Excluiu a despesa "Internet"');
    expect(describeEntryRemoval(before)).toContain(formatBRL("120.00"));
    expect(describeEntryRestore({ type: "income", description: "Salário" })).toBe(
      'Restaurou a receita "Salário".',
    );
  });
});
