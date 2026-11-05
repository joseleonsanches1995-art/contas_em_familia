"use client";

import { useActionState } from "react";
import { createEntry, updateEntry, type EntryState } from "@/actions/entries";

const initial: EntryState = {};

export type EntryFormValues = {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: string;
  categoryId: string;
  dueDate: string;
  notes: string;
};

export function EntryForm({
  categories,
  today,
  entry,
}: {
  categories: Array<{ id: string; name: string }>;
  today: string;
  entry?: EntryFormValues;
}) {
  const [state, action, pending] = useActionState(entry ? updateEntry : createEntry, initial);
  const type = entry?.type ?? "expense";

  return (
    <form action={action} className="flex flex-col gap-4">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Tipo</legend>
        <label className="flex min-h-11 items-center justify-center rounded-full border border-line bg-card has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            className="sr-only"
            type="radio"
            name="type"
            value="expense"
            defaultChecked={type === "expense"}
          />
          Despesa
        </label>
        <label className="flex min-h-11 items-center justify-center rounded-full border border-line bg-card has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            className="sr-only"
            type="radio"
            name="type"
            value="income"
            defaultChecked={type === "income"}
          />
          Receita
        </label>
      </fieldset>

      <Field label="Descrição" name="description" defaultValue={entry?.description} required />
      <Field
        label="Valor"
        name="amount"
        inputMode="decimal"
        placeholder="0,00"
        defaultValue={entry?.amount}
        required
      />

      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select
          name="categoryId"
          required
          defaultValue={entry?.categoryId || categories[0]?.id}
          className="min-h-11 rounded-xl border border-line bg-card px-3"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Vencimento"
        name="dueDate"
        type="date"
        defaultValue={entry?.dueDate ?? today}
        required
      />
      <Field label="Observação" name="notes" defaultValue={entry?.notes} />

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Salvando..." : entry ? "Salvar alterações" : "Salvar lançamento"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        type={type}
        className="min-h-11 rounded-xl border border-line bg-card px-3"
        {...props}
      />
    </label>
  );
}
