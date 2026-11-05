import Link from "next/link";
import type { ReactNode } from "react";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";

export function MonthSwitcher({
  monthKey,
  path,
  children,
}: {
  monthKey: string;
  path: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card px-3 py-4">
      <div className="flex items-center gap-1">
        <MonthLink
          href={`${path}?mes=${shiftMonth(monthKey, -1)}`}
          label="Mês anterior"
          direction="previous"
        />
        <p className="flex-1 text-center text-base font-semibold tracking-tight">
          {formatMonthLabel(monthKey)}
        </p>
        <MonthLink
          href={`${path}?mes=${shiftMonth(monthKey, 1)}`}
          label="Próximo mês"
          direction="next"
        />
      </div>
      {children ? <div className="px-2 pt-4">{children}</div> : null}
    </section>
  );
}

function MonthLink({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: "previous" | "next";
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
    >
      <Chevron direction={direction} />
    </Link>
  );
}

function Chevron({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "previous" ? <path d="M14.5 6 8.5 12l6 6" /> : <path d="M9.5 6l6 6-6 6" />}
    </svg>
  );
}
