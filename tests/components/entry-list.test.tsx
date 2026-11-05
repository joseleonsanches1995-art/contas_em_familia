import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { entry } from "../helpers/entry";

vi.mock("@/actions/entries", () => ({ markPaid: vi.fn(), deleteEntry: vi.fn() }));

import { EntryList } from "@/components/entry-list";

describe("lista de lançamentos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o estado vazio", () => {
    render(<EntryList entries={[]} empty="Nenhum lançamento neste mês." />);
    expect(screen.getByText("Nenhum lançamento neste mês.")).toBeInTheDocument();
  });

  it("oferece pagamento para despesa pendente e recebimento para receita", () => {
    render(
      <EntryList
        entries={[
          entry(),
          entry({
            id: "entry-2",
            type: "income",
            description: "Salário",
            amount: new Prisma.Decimal("1000.00"),
            status: "pending",
          }),
        ]}
        empty=""
      />,
    );

    expect(screen.getAllByText(/Vence hoje · Moradia/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Marcar como pago" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Editar" })[0]).toHaveAttribute(
      "href",
      "/lancamentos/entry-1",
    );
    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Marcar como recebido" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana")).toHaveLength(2);
  });

  it("mostra pago quando o lançamento já foi quitado", () => {
    render(<EntryList entries={[entry({ status: "paid" })]} empty="" />);
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });
});
