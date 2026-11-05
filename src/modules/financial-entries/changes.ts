import { formatBRL } from "@/lib/money";

export type EntrySnapshot = {
  type: "income" | "expense";
  description: string;
  amount: string;
  categoryName: string;
  dueDate: string;
  notes: string | null;
};

const TYPE_LABEL = { income: "receita", expense: "despesa" } as const;

export function describeEntryChange(before: EntrySnapshot, after: EntrySnapshot): string | null {
  const parts: string[] = [];

  if (before.type !== after.type) {
    parts.push(`tipo de ${TYPE_LABEL[before.type]} para ${TYPE_LABEL[after.type]}`);
  }
  if (before.description !== after.description) {
    parts.push(`descrição de "${before.description}" para "${after.description}"`);
  }
  if (before.amount !== after.amount) {
    parts.push(`valor de ${formatBRL(before.amount)} para ${formatBRL(after.amount)}`);
  }
  if (before.categoryName !== after.categoryName) {
    parts.push(`categoria de ${before.categoryName} para ${after.categoryName}`);
  }
  if (before.dueDate !== after.dueDate) {
    parts.push(`vencimento de ${formatDay(before.dueDate)} para ${formatDay(after.dueDate)}`);
  }

  const previousNotes = before.notes?.trim() ?? "";
  const nextNotes = after.notes?.trim() ?? "";
  if (previousNotes !== nextNotes) {
    parts.push(
      `observação de "${previousNotes || "nenhuma"}" para "${nextNotes || "nenhuma"}"`,
    );
  }

  if (parts.length === 0) return null;
  return `Editou "${before.description}": ${parts.join("; ")}.`;
}

export function describeEntryRemoval(entry: Pick<EntrySnapshot, "type" | "description" | "amount">) {
  return `Excluiu a ${TYPE_LABEL[entry.type]} "${entry.description}" de ${formatBRL(entry.amount)}.`;
}

export function describeEntryRestore(entry: Pick<EntrySnapshot, "type" | "description">) {
  return `Restaurou a ${TYPE_LABEL[entry.type]} "${entry.description}".`;
}

function formatDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
