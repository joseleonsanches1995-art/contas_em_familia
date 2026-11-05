const TIME_ZONE = "America/Sao_Paulo";

export function brazilToday(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return dateOnly(iso);
}

export function dateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthKey(): string {
  return toIsoDate(brazilToday()).slice(0, 7);
}

export function parseMonthKey(value: string | undefined): {
  year: number;
  month: number;
  key: string;
} {
  const fallback = currentMonthKey();
  const key = value && /^\d{4}-\d{2}$/.test(value) ? value : fallback;
  const [year, month] = key.split("-").map(Number);
  if (month < 1 || month > 12) {
    const [fallbackYear, fallbackMonth] = fallback.split("-").map(Number);
    return { year: fallbackYear, month: fallbackMonth, key: fallback };
  }
  return { year, month, key };
}

export function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return toIsoDate(shifted).slice(0, 7);
}

export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDue(date: Date, today = brazilToday()): string {
  if (sameDay(date, today)) return "Vence hoje";
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (sameDay(date, tomorrow)) return "Vence amanhã";
  const short = `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return date < today ? `Venceu em ${short}` : `Vence em ${short}`;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}
