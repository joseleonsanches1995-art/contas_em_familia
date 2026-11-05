import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { entry } from "../helpers/entry";

const requireMembership = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
const findCategories = vi.hoisted(() => vi.fn());
const findInvites = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/lib/session", () => ({ requireMembership }));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/actions/entries", () => ({
  markPaid: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));
vi.mock("@/actions/household", () => ({
  acceptInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEntry: { findMany },
    category: { findMany: findCategories },
    householdInvite: { findMany: findInvites },
  },
}));

import HomePage from "@/app/(app)/page";
import ContasPage from "@/app/(app)/contas/page";
import AgendaPage from "@/app/(app)/agenda/page";
import AnalisesPage from "@/app/(app)/analises/page";
import NovoPage from "@/app/(app)/lancamentos/novo/page";
import AppLayout from "@/app/(app)/layout";

const membership = {
  householdId: "house-1",
  userId: "user-1",
  household: { name: "Financeiro da família" },
  user: { name: "Ana Souza", email: "ana@contasemfamilia.local" },
};

describe("telas autenticadas", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T15:00:00.000Z"));
    requireMembership.mockResolvedValue(membership);
    findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if ("competenceDate" in where) {
        return [
          entry({ amount: new Prisma.Decimal("1200.00"), status: "paid" }),
          entry({
            id: "entry-2",
            description: "Energia",
            amount: new Prisma.Decimal("1850.00"),
            category: { ...entry().category!, name: "Moradia" },
          }),
          entry({
            id: "entry-3",
            type: "income",
            description: "Salário",
            amount: new Prisma.Decimal("6500.00"),
            status: "paid",
          }),
        ];
      }
      if (where.dueDate && typeof where.dueDate === "object" && "lt" in where.dueDate) {
        return [entry({ id: "late", description: "Aluguel", dueDate: new Date("2026-11-01T00:00:00.000Z") })];
      }
      return [entry({ id: "next", description: "Água", dueDate: new Date("2026-11-10T00:00:00.000Z") })];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o saldo previsto, o que falta pagar e o que já foi pago", async () => {
    render(await HomePage({ searchParams: Promise.resolve({ mes: "2026-11" }) }));

    expect(screen.getByRole("heading", { name: "Olá, Ana" })).toBeInTheDocument();
    expect(screen.getByText(/3\.450,00/)).toBeInTheDocument();
    expect(screen.getByText("Receita do mês")).toBeInTheDocument();
    expect(screen.getByText("Receitas total")).toBeInTheDocument();
    expect(screen.getByText("Despesas anteriores")).toBeInTheDocument();
    expect(screen.getByText("A pagar").parentElement).toHaveTextContent("1.850,00");
    expect(screen.getByText("Já pago no mês").parentElement).toHaveTextContent("1.200,00");
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getByText("Água")).toBeInTheDocument();
  });

  it("lista as contas do mês pela competência", async () => {
    render(await ContasPage({ searchParams: Promise.resolve({ mes: "2026-11" }) }));
    expect(screen.getByRole("heading", { name: "Contas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novembro de 2026" })).toBeInTheDocument();
    expect(screen.getByText("Energia")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
  });

  it("separa vencidas e próximos vencimentos na agenda", async () => {
    render(await AgendaPage());
    expect(screen.getByRole("heading", { name: "Vencidas" })).toBeInTheDocument();
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getByText("Água")).toBeInTheDocument();
    expect(screen.getByText(/Vence em 10\/11/)).toBeInTheDocument();
  });

  it("agrupa as despesas da análise e ignora a receita na barra", async () => {
    render(await AnalisesPage({ searchParams: Promise.resolve({ mes: "2026-11" }) }));
    expect(screen.getByText("Despesas por categoria")).toBeInTheDocument();
    expect(screen.getByText("Moradia")).toBeInTheDocument();
    expect(screen.getAllByText(/3\.050,00/)).toHaveLength(2);
    expect(screen.queryByText("Salário")).not.toBeInTheDocument();
  });

  it("abre o formulário com as categorias do espaço", async () => {
    findCategories.mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", name: "Moradia" },
      { id: "22222222-2222-4222-8222-222222222222", name: "Alimentação" },
    ]);
    render(await NovoPage());
    expect(screen.getByRole("heading", { name: "Novo lançamento" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Moradia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alimentação" })).toBeInTheDocument();
  });

  it("envolve as telas com a barra inferior", async () => {
    render(await AppLayout({ children: <p>Conteúdo</p> }));
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Família" })).toHaveAttribute("href", "/familia");
    expect(screen.getByRole("link", { name: "Histórico" })).toHaveAttribute("href", "/historico");
  });
});
