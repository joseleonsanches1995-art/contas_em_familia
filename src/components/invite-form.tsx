"use client";

import { useActionState } from "react";
import { sendInvite, type InviteState } from "@/actions/household";

const initial: InviteState = {};

export function InviteForm() {
  const [state, action, pending] = useActionState(sendInvite, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        E-mail de quem vai entrar
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="esposa@email.com"
          className="min-h-11 rounded-xl border border-line bg-card px-3"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-accent">{state.ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Convidar"}
      </button>
    </form>
  );
}
