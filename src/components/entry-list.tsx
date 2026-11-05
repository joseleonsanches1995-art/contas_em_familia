import Link from "next/link";
import { markPaid } from "@/actions/entries";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { formatDue } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { EntryWithRelations } from "@/modules/financial-entries/queries";

export function EntryList({
  entries,
  empty,
}: {
  entries: EntryWithRelations[];
  empty: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const pending = entry.status === "pending";
        return (
          <li key={entry.id} className="rounded-2xl bg-card px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{entry.description}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatDue(entry.dueDate)}
                  {entry.category ? ` · ${entry.category.name}` : ""}
                </p>
              </div>
              <p
                className={`font-medium ${entry.type === "income" ? "text-accent" : ""}`}
              >
                {entry.type === "income" ? "+" : "−"} {formatBRL(entry.amount)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{entry.creator.name.split(" ")[0]}</p>
              <div className="flex flex-wrap items-center gap-1">
                <Link
                  href={`/lancamentos/${entry.id}`}
                  className="inline-flex min-h-11 items-center px-3 text-sm text-muted"
                >
                  Editar
                </Link>
                <DeleteEntryButton id={entry.id} />
              </div>
            </div>
            {pending ? (
              <form action={markPaid} className="mt-1">
                <input type="hidden" name="id" value={entry.id} />
                <button className="min-h-11 w-full rounded-full bg-accent px-4 text-sm font-medium text-white">
                  {entry.type === "income" ? "Marcar como recebido" : "Marcar como pago"}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-accent">
                {entry.type === "income" ? "Recebido" : "Pago"}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
