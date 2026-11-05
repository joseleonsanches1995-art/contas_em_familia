import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const login = vi.hoisted(() => vi.fn());
const register = vi.hoisted(() => vi.fn());
const createEntry = vi.hoisted(() => vi.fn());
const updateEntry = vi.hoisted(() => vi.fn());

vi.mock("@/actions/auth", () => ({ login, register }));
vi.mock("@/actions/entries", () => ({ createEntry, updateEntry }));

import { LoginForm, RegisterForm } from "@/components/auth-forms";
import { EntryForm } from "@/components/entry-form";

describe("formulários", () => {
  it("mostra o erro devolvido pelo login", async () => {
    login.mockResolvedValue({ error: "E-mail ou senha incorretos." });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("E-mail"), "ana@familia.com");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(login).toHaveBeenCalled();
  });

  it("oferece o espaço da família já preenchido no cadastro", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Nome do espaço")).toHaveValue("Financeiro da família");
    expect(screen.getByRole("link", { name: "Já tenho conta" })).toHaveAttribute("href", "/entrar");
  });

  it("mostra o erro do lançamento e começa em despesa", async () => {
    createEntry.mockResolvedValue({
      error: "Informe um valor maior que zero, com até duas casas.",
    });
    const user = userEvent.setup();
    render(
      <EntryForm
        categories={[{ id: "11111111-1111-4111-8111-111111111111", name: "Moradia" }]}
        today="2026-11-05"
      />,
    );

    expect(screen.getByRole("radio", { name: "Despesa" })).toBeChecked();
    await user.type(screen.getByLabelText("Descrição"), "Internet");
    await user.type(screen.getByLabelText("Valor"), "0");
    await user.click(screen.getByRole("button", { name: "Salvar lançamento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Informe um valor maior que zero, com até duas casas.",
    );
  });

  it("abre a edição com os dados do lançamento", () => {
    render(
      <EntryForm
        categories={[
          { id: "11111111-1111-4111-8111-111111111111", name: "Moradia" },
          { id: "22222222-2222-4222-8222-222222222222", name: "Alimentação" },
        ]}
        today="2026-11-05"
        entry={{
          id: "33333333-3333-4333-8333-333333333333",
          type: "income",
          description: "Salário",
          amount: "6500,00",
          categoryId: "22222222-2222-4222-8222-222222222222",
          dueDate: "2026-11-08",
          notes: "mês",
        }}
      />,
    );

    expect(screen.getByRole("radio", { name: "Receita" })).toBeChecked();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Salário");
    expect(screen.getByLabelText("Valor")).toHaveValue("6500,00");
    expect(screen.getByLabelText("Categoria")).toHaveValue("22222222-2222-4222-8222-222222222222");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });
});
