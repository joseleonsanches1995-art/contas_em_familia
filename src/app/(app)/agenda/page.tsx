import { EntryList } from "@/components/entry-list";
import { requireMembership } from "@/lib/session";
import { getAgenda } from "@/modules/financial-entries/queries";

export default async function AgendaPage() {
  const membership = await requireMembership();
  const agenda = await getAgenda(membership.householdId);

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Vencidas</h2>
        <EntryList entries={agenda.overdue} empty="Nenhuma conta vencida." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Próximos vencimentos</h2>
        <EntryList entries={agenda.upcoming} empty="Nada pendente pela frente." />
      </section>
    </main>
  );
}
