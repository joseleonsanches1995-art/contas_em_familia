import { restoreEntry } from "@/actions/entries";
import { requireMembership } from "@/lib/session";
import { getChangeHistory } from "@/modules/financial-entries/queries";

const ACTION_LABEL = {
  updated: "Edição",
  deleted: "Exclusão",
  restored: "Restauração",
} as const;

export default async function HistoricoPage() {
  const membership = await requireMembership();
  const logs = await getChangeHistory(membership.householdId);

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="mt-2 text-sm text-muted">
          Edições e exclusões de receitas e despesas, com quem fez e quando.
        </p>
      </header>

      {logs.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma edição ou exclusão ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => {
            const label = ACTION_LABEL[log.action as keyof typeof ACTION_LABEL] ?? "Alteração";
            return (
              <li key={log.id} className="rounded-2xl bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{log.user.name}</p>
                  <time
                    dateTime={log.createdAt.toISOString()}
                    className="text-xs text-muted"
                  >
                    {formatWhen(log.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-xs tracking-wide text-muted uppercase">{label}</p>
                <p className="mt-1 text-sm">{log.description}</p>
                {log.canRestore ? (
                  <form action={restoreEntry} className="mt-3">
                    <input type="hidden" name="id" value={log.entityId} />
                    <button className="min-h-11 rounded-full border border-line px-4 text-sm">
                      Restaurar
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
