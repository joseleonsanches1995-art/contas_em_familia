import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const requireMembership = vi.hoisted(() => vi.fn());
const logFind = vi.hoisted(() => vi.fn());
const entryFind = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ requireMembership }));
vi.mock("@/actions/entries", () => ({ restoreEntry: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { findMany: logFind },
    financialEntry: { findMany: entryFind },
  },
}));

import HistoricoPage from "@/app/(app)/historico/page";

describe("histórico", () => {
  it("mostra quem editou ou excluiu e oferece restaurar o que ainda está apagado", async () => {
    requireMembership.mockResolvedValue({
      householdId: "house-1",
      household: { name: "Financeiro da família" },
    });
    logFind.mockResolvedValue([
      {
        id: "log-1",
        action: "updated",
        entityId: "entry-1",
        description: 'Editou "Internet": valor de R$ 80,00 para R$ 90,00.',
        createdAt: new Date("2026-11-05T18:30:00.000Z"),
        user: { name: "Ana Souza" },
      },
      {
        id: "log-2",
        action: "deleted",
        entityId: "entry-2",
        description: 'Excluiu a despesa "Luz de outubro" de R$ 80,00.',
        createdAt: new Date("2026-11-05T19:00:00.000Z"),
        user: { name: "Bruno Lima" },
      },
    ]);
    entryFind.mockResolvedValue([{ id: "entry-2" }]);

    render(await HistoricoPage());

    expect(screen.getByRole("heading", { name: "Histórico" })).toBeInTheDocument();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
    expect(screen.getByText(/valor de R\$ 80,00 para R\$ 90,00/)).toBeInTheDocument();
    expect(screen.getByText("Edição")).toBeInTheDocument();
    expect(screen.getByText("Exclusão")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument();
  });

  it("explica quando ainda não houve alteração", async () => {
    requireMembership.mockResolvedValue({
      householdId: "house-1",
      household: { name: "Financeiro da família" },
    });
    logFind.mockResolvedValue([]);

    render(await HistoricoPage());

    expect(screen.getByText("Nenhuma edição ou exclusão ainda.")).toBeInTheDocument();
  });
});
