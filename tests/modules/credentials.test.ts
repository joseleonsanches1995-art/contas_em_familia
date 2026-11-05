import { describe, expect, it, vi } from "vitest";
import { applySessionUser, authorizeCredentials } from "@/modules/auth/credentials";

const user = {
  id: "user-1",
  email: "ana@familia.com",
  name: "Ana Souza",
  passwordHash: "hash",
};

describe("autorização por e-mail e senha", () => {
  it("recusa credencial incompleta", async () => {
    const findUserByEmail = vi.fn();
    const result = await authorizeCredentials(
      { email: "nao-e-email", password: "" },
      { findUserByEmail, comparePassword: vi.fn() },
    );
    expect(result).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it("busca o e-mail em minúsculas e não devolve a senha", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(user);
    const comparePassword = vi.fn().mockResolvedValue(true);

    const result = await authorizeCredentials(
      { email: "Ana@Familia.com", password: "familia123" },
      { findUserByEmail, comparePassword },
    );

    expect(findUserByEmail).toHaveBeenCalledWith("ana@familia.com");
    expect(comparePassword).toHaveBeenCalledWith("familia123", "hash");
    expect(result).toEqual({
      id: "user-1",
      email: "ana@familia.com",
      name: "Ana Souza",
    });
  });

  it("recusa usuário inexistente e senha errada", async () => {
    await expect(
      authorizeCredentials(
        { email: "ana@familia.com", password: "familia123" },
        { findUserByEmail: vi.fn().mockResolvedValue(null), comparePassword: vi.fn() },
      ),
    ).resolves.toBeNull();

    await expect(
      authorizeCredentials(
        { email: "ana@familia.com", password: "errada" },
        {
          findUserByEmail: vi.fn().mockResolvedValue(user),
          comparePassword: vi.fn().mockResolvedValue(false),
        },
      ),
    ).resolves.toBeNull();
  });
});

describe("sessão", () => {
  it("grava o id do token no usuário da sessão", () => {
    const session = { user: { name: "Ana", id: "" } };
    expect(applySessionUser(session, { sub: "user-1" }).user?.id).toBe("user-1");
  });

  it("não inventa usuário quando a sessão está vazia", () => {
    const session = { user: undefined };
    expect(applySessionUser(session, { sub: "user-1" }).user).toBeUndefined();
  });
});
