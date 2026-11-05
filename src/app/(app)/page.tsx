import Link from "next/link";
import { logout } from "@/actions/auth";
import { EntryList } from "@/components/entry-list";
import { ReceivedInvites } from "@/components/received-invites";
import { MonthSwitcher } from "@/components/month-switcher";
import { parseMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { requireMembership } from "@/lib/session";
import {
  getAgenda,
  getEntriesUntilMonth,
  rollForward,
} from "@/modules/financial-entries/queries";
import { getReceivedInvites } from "@/modules/households/invites";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const membership = await requireMembership();
  const { mes } = await searchParams;
  const month = parseMonthKey(mes);
  const [entries, agenda, invites] = await Promise.all([
    getEntriesUntilMonth(membership.householdId, month.key),
    getAgenda(membership.householdId),
    getReceivedInvites(membership.user.email),
  ]);
  const totals = rollForward(entries, month.key);
  const firstName = membership.user.name.split(" ")[0];
  const upcoming = agenda.upcoming.slice(0, 4);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{membership.household.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName}</h1>
        </div>
        <form action={logout}>
          <button className="min-h-11 text-sm text-muted">Sair</button>
        </form>
      </header>

      <ReceivedInvites invites={invites} />

      <MonthSwitcher monthKey={month.key} path="/">
        <p className="text-xs tracking-wide text-muted uppercase">Saldo previsto</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          {formatBRL(totals.predicted)}
        </p>
        <p className="mt-2 text-sm text-muted">
          O saldo junta os meses anteriores com o mês em tela.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div>
            <dt className="text-muted">Receita do mês</dt>
            <dd className="font-medium">{formatBRL(totals.monthIncome)}</dd>
          </div>
          <div>
            <dt className="text-muted">Receitas total</dt>
            <dd className="font-medium">{formatBRL(totals.totalIncome)}</dd>
          </div>
          <div>
            <dt className="text-muted">Despesas do mês</dt>
            <dd className="font-medium">{formatBRL(totals.monthExpenses)}</dd>
          </div>
          <div>
            <dt className="text-muted">Despesas anteriores</dt>
            <dd className="font-medium">{formatBRL(totals.priorExpenses)}</dd>
          </div>
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-danger-soft px-3 py-3">
            <p className="text-xs text-danger">A pagar</p>
            <p className="mt-1 text-lg font-semibold">{formatBRL(totals.pending)}</p>
          </div>
          <div className="rounded-2xl bg-accent-soft px-3 py-3">
            <p className="text-xs text-accent">Já pago no mês</p>
            <p className="mt-1 text-lg font-semibold">{formatBRL(totals.paid)}</p>
          </div>
        </div>
      </MonthSwitcher>

      {agenda.overdue.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Vencidas</h2>
          <EntryList entries={agenda.overdue} empty="" />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Próximas contas</h2>
        <EntryList
          entries={upcoming}
          empty="Nada pendente nos próximos dias."
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
