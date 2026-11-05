import Link from "next/link";
import { EntryList } from "@/components/entry-list";
import { MonthSwitcher } from "@/components/month-switcher";
import { parseMonthKey } from "@/lib/dates";
import { requireMembership } from "@/lib/session";
import { getEntriesUntilMonth, rollForward } from "@/modules/financial-entries/queries";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const membership = await requireMembership();
  const { mes } = await searchParams;
  const month = parseMonthKey(mes);
  const snapshot = rollForward(
    await getEntriesUntilMonth(membership.householdId, month.key),
    month.key,
  );
  const nothingToShow =
    snapshot.carriedUnpaid.length === 0 && snapshot.monthEntries.length === 0;

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
      </header>
      <MonthSwitcher monthKey={month.key} path="/contas" />
      {snapshot.carriedUnpaid.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Em aberto de meses anteriores</h2>
          <EntryList entries={snapshot.carriedUnpaid} empty="" />
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lançamentos</h2>
        <EntryList
          entries={snapshot.monthEntries}
          empty={
            nothingToShow
              ? "Nenhum lançamento até este mês."
              : "Nenhum lançamento neste mês."
          }
        />
      </section>
      <Link
        href="/lancamentos/novo"
        className="flex min-h-12 items-center justify-center rounded-full bg-accent text-sm font-medium text-white"
      >
        Novo lançamento
      </Link>
    </main>
  );
}
