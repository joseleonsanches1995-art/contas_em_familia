import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  brazilToday,
  currentMonthKey,
  dateOnly,
  formatDue,
  formatMonthLabel,
  monthRange,
  parseMonthKey,
  shiftMonth,
  toIsoDate,
} from "@/lib/dates";

const FROZEN = new Date("2026-11-05T15:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("datas do calendário brasileiro", () => {
  it("usa o dia civil de São Paulo, não o dia UTC", () => {
    vi.setSystemTime(new Date("2026-11-05T02:00:00.000Z"));
    expect(toIsoDate(brazilToday())).toBe("2026-11-04");
  });

  it("mantém o mesmo dia quando já passou da meia-noite em Brasília", () => {
    expect(toIsoDate(brazilToday())).toBe("2026-11-05");
    expect(currentMonthKey()).toBe("2026-11");
  });

  it("converte uma data civil para meia-noite UTC e de volta", () => {
    const date = dateOnly("2026-02-28");
    expect(date.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(toIsoDate(date)).toBe("2026-02-28");
  });

  it("rejeita mês inválido e texto solto, caindo no mês corrente", () => {
    expect(parseMonthKey("2026-13").key).toBe("2026-11");
    expect(parseMonthKey("novembro").key).toBe("2026-11");
    expect(parseMonthKey(undefined)).toEqual({ year: 2026, month: 11, key: "2026-11" });
  });

  it("aceita um mês válido", () => {
    expect(parseMonthKey("2026-01")).toEqual({ year: 2026, month: 1, key: "2026-01" });
  });

  it("delimita o mês com início inclusivo e fim exclusivo", () => {
    const range = monthRange(2026, 11);
    expect(range.start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("atravessa a virada de ano", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("escreve o mês em português", () => {
    expect(formatMonthLabel("2026-11")).toBe("Novembro de 2026");
  });

  it("diferencia hoje, amanhã, vencido e a vencer", () => {
    const today = brazilToday();
    expect(formatDue(today, today)).toBe("Vence hoje");
    expect(formatDue(dateOnly("2026-11-06"), today)).toBe("Vence amanhã");
    expect(formatDue(dateOnly("2026-11-04"), today)).toBe("Venceu em 04/11");
    expect(formatDue(dateOnly("2026-11-10"), today)).toBe("Vence em 10/11");
  });
});
