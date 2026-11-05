import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { formatBRL, parseAmount, sumAmounts } from "@/lib/money";

function plain(value: string) {
  return value.replace(/\s/g, "");
}

describe("dinheiro", () => {
  it("formata real com duas casas", () => {
    expect(plain(formatBRL("3450"))).toBe("R$3.450,00");
    expect(plain(formatBRL(new Prisma.Decimal("120.5")))).toBe("R$120,50");
  });

  it("mostra saldo negativo sem perder o sinal", () => {
    expect(plain(formatBRL("-120.00"))).toContain("120,00");
    expect(plain(formatBRL("-120.00"))).toMatch(/-|−/);
  });

  it("aceita vírgula, ponto e milhar brasileiro", () => {
    expect(parseAmount("120,00")).toBe("120.00");
    expect(parseAmount("120.5")).toBe("120.50");
    expect(parseAmount("1.234,56")).toBe("1234.56");
    expect(parseAmount("  10 ")).toBe("10.00");
  });

  it("recusa zero, negativo, vazio e casas a mais", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("0,00")).toBeNull();
    expect(parseAmount("-10")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("10,999")).toBeNull();
  });

  it("soma decimais sem erro de ponto flutuante", () => {
    const total = sumAmounts(["0.10", "0.20", new Prisma.Decimal("10.00")]);
    expect(total.toFixed(2)).toBe("10.30");
  });
});
