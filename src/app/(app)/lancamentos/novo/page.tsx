import { EntryForm } from "@/components/entry-form";
import { brazilToday, toIsoDate } from "@/lib/dates";
import { requireMembership } from "@/lib/session";
import { getCategories } from "@/modules/financial-entries/queries";

export default async function NovoLancamentoPage() {
  const membership = await requireMembership();
  const categories = await getCategories(membership.householdId);

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Novo lançamento</h1>
      </header>
      <EntryForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        today={toIsoDate(brazilToday())}
      />
    </main>
  );
}
