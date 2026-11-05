import { Prisma } from "@/generated/prisma/client";

export function formatBRL(value: Prisma.Decimal | string | number): string {
  const amount = typeof value === "object" ? Number(value.toString()) : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function parseAmount(input: string): string | null {
  const raw = input.trim().replace(/\s/g, "");
  if (!raw) return null;

  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(2);
}

export function sumAmounts(
  values: Array<Prisma.Decimal | string | number>,
): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(new Prisma.Decimal(value.toString())),
    new Prisma.Decimal(0),
  );
}
