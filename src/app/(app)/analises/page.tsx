import { MonthSwitcher } from "@/components/month-switcher";
import { parseMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { requireMembership } from "@/lib/session";
import {
  expensesByCategory,
  getMonthEntries,
  shareWidth,
  summarize,
} from "@/modules/financial-entries/queries";

export default async function AnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const membership = await requireMembership();
  const { mes } = await searchParams;
  const month = parseMonthKey(mes);
  const entries = await getMonthEntries(membership.householdId, month.key);
  const totals = summarize(entries);
  const rows = expensesByCategory(entries);
  const max = rows[0]?.amount;

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Análises</h1>
      </header>
      <MonthSwitcher monthKey={month.key} path="/analises" />
      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl bg-card px-4 py-4">
          <p className="text-xs text-muted">Receitas</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.income)}</p>
        </article>
        <article className="rounded-2xl bg-card px-4 py-4">
          <p className="text-xs text-muted">Despesas</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.expense)}</p>
        </article>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Despesas por categoria</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Sem despesas neste mês.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map(({ name, amount }) => {
              const width = max ? shareWidth(amount, max) : 0;
              return (
                <li key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{name}</span>
                    <span className="font-medium">{formatBRL(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
