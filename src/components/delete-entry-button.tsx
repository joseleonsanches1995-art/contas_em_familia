"use client";

import { useState } from "react";
import { deleteEntry } from "@/actions/entries";

export function DeleteEntryButton({
  id,
  next,
  label = "Excluir",
}: {
  id: string;
  next?: string;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center px-3 text-sm text-danger"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={deleteEntry} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <span className="text-sm text-danger">Excluir este lançamento?</span>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-full bg-danger px-4 text-sm font-medium text-white"
      >
        Confirmar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="inline-flex min-h-11 items-center px-3 text-sm text-muted"
      >
        Cancelar
      </button>
    </form>
  );
}
