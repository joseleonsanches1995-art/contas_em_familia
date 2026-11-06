"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { login, register, type AuthState } from "@/actions/auth";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <AuthShell
      title="Entrar"
      subtitle="Entre com o seu e-mail. Um convite para o espaço de outra pessoa aparece depois do login."
      footer={<Link href="/cadastrar">Criar a primeira conta</Link>}
    >
      <form action={action} className="flex flex-col gap-4" >
        <TextField label="E-mail" name="email" type="email" autoComplete="email" />
        <TextField label="Senha" name="password" type="password" autoComplete="current-password" />
        {state.error ? <Alert>{state.error}</Alert> : null}
        <Submit pending={pending} label="Entrar" pendingLabel="Entrando..." />
      </form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);

  return (
    <AuthShell
      title="Criar o espaço"
      subtitle="Cada pessoa cria o próprio login. Depois, quem já tem o espaço convida o outro pelo e-mail."
      footer={<Link href="/entrar">Já tenho conta</Link>}
    >
      <form action={action} className="flex flex-col gap-4">
        <TextField label="Seu nome" name="name" autoComplete="name" />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" />
        <TextField label="Senha" name="password" type="password" autoComplete="new-password" />
        <TextField
          label="Nome do espaço"
          name="householdName"
          defaultValue="Financeiro da família"
        />
        {state.error ? <Alert>{state.error}</Alert> : null}
        <Submit pending={pending} label="Criar e entrar" pendingLabel="Criando..." />
      </form>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium text-accent">Contas em Família</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
      <p className="mt-6 text-sm text-muted">{footer}</p>
    </main>
  );
}

function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        className="min-h-11 rounded-xl border border-line bg-card px-3"
      />
    </label>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

function Submit({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
