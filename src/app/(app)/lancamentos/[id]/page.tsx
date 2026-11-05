import { notFound } from "next/navigation";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { EntryForm } from "@/components/entry-form";
import { toIsoDate } from "@/lib/dates";
import { requireMembership } from "@/lib/session";
import { getCategories, getEditableEntry } from "@/modules/financial-entries/queries";

export default async function EditarLancamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireMembership();
  const [entry, categories] = await Promise.all([
    getEditableEntry(membership.householdId, id),
    getCategories(membership.householdId),
  ]);
  if (!entry) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Editar lançamento</h1>
        <p className="mt-2 text-sm text-muted">
          A alteração fica no histórico com o seu nome.
          {entry.status === "paid"
            ? " O pagamento já registrado continua."
            : ""}
        </p>
      </header>
      <EntryForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        today={toIsoDate(entry.dueDate)}
        entry={{
          id: entry.id,
          type: entry.type,
          description: entry.description,
          amount: entry.amount.toFixed(2).replace(".", ","),
          categoryId: entry.categoryId ?? "",
          dueDate: toIsoDate(entry.dueDate),
          notes: entry.notes ?? "",
        }}
      />
      <DeleteEntryButton id={entry.id} next="/historico" label="Excluir lançamento" />
    </main>
  );
}
