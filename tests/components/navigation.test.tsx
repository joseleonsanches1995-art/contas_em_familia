import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathname = vi.hoisted(() => vi.fn(() => "/"));

vi.mock("next/navigation", () => ({
  usePathname,
}));

import { BottomNav } from "@/components/bottom-nav";
import { MonthSwitcher } from "@/components/month-switcher";

describe("navegação", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  it("marca só o início quando a rota é a raiz", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Início" })).toHaveClass("text-accent");
    expect(screen.getByRole("link", { name: "Contas" })).toHaveClass("text-muted");
    expect(screen.getByRole("link", { name: "Família" })).toHaveAttribute("href", "/familia");
  });

  it("marca a seção atual sem acender o início", () => {
    usePathname.mockReturnValue("/analises");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Análises" })).toHaveClass("text-accent");
    expect(screen.getByRole("link", { name: "Início" })).toHaveClass("text-muted");
  });

  it("troca o mês para trás e para frente na mesma tela", () => {
    render(<MonthSwitcher monthKey="2026-01" path="/contas" />);
    expect(screen.getByRole("link", { name: "Mês anterior" })).toHaveAttribute(
      "href",
      "/contas?mes=2025-12",
    );
    expect(screen.getByRole("link", { name: "Próximo mês" })).toHaveAttribute(
      "href",
      "/contas?mes=2026-02",
    );
    expect(screen.getByText("Janeiro de 2026")).toBeInTheDocument();
  });
});
