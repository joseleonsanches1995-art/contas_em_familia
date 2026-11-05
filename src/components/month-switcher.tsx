import Link from "next/link";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";

export function MonthSwitcher({
  monthKey,
  path,
}: {
  monthKey: string;
  path: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`${path}?mes=${shiftMonth(monthKey, -1)}`}
        className="min-h-11 rounded-full px-3 text-sm text-muted"
      >
        Anterior
      </Link>
      <p className="text-sm font-medium">{formatMonthLabel(monthKey)}</p>
      <Link
        href={`${path}?mes=${shiftMonth(monthKey, 1)}`}
        className="min-h-11 rounded-full px-3 text-sm text-muted"
      >
        Próximo
      </Link>
    </div>
  );
}
