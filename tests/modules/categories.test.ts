import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/modules/categories/defaults";

describe("categorias iniciais", () => {
  it("segue a lista da especificação, sem repetir nome", () => {
    expect([...DEFAULT_CATEGORIES]).toEqual([
      "Moradia",
      "Alimentação",
      "Transporte",
      "Saúde",
      "Educação",
      "Lazer",
      "Assinaturas",
      "Impostos",
      "Outros",
    ]);
    expect(new Set(DEFAULT_CATEGORIES).size).toBe(DEFAULT_CATEGORIES.length);
  });
});
