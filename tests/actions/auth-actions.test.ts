import { describe, expect, it, vi } from "vitest";
import { formData } from "../helpers/entry";

const signIn = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const registerHousehold = vi.hoisted(() => vi.fn());
const AuthError = vi.hoisted(() => class AuthError extends Error {});

vi.mock("next-auth", () => ({ AuthError }));
vi.mock("@/auth", () => ({ signIn, signOut }));
vi.mock("@/modules/households/service", () => ({ registerHousehold }));

import { login, logout, register } from "@/actions/auth";

describe("cadastro", () => {
  it("explica o primeiro campo inválido", async () => {
    const result = await register(
      {},
      formData({
        name: "A",
        email: "ana@familia.com",
        password: "familia123",
        householdName: "Casa",
      }),
    );
    expect(result).toEqual({ error: "Informe seu nome." });
    expect(registerHousehold).not.toHaveBeenCalled();
  });

  it("exige e-mail, senha e nome do espaço", async () => {
    await expect(
      register({}, formData({ name: "Ana", email: "ana", password: "familia123", householdName: "Casa" })),
    ).resolves.toEqual({ error: "Informe um e-mail válido." });

    await expect(
      register({}, formData({ name: "Ana", email: "ana@familia.com", password: "curta", householdName: "Casa" })),
    ).resolves.toEqual({ error: "A senha precisa ter pelo menos 8 caracteres." });

    await expect(
      register({}, formData({ name: "Ana", email: "ana@familia.com", password: "familia123", householdName: " " })),
    ).resolves.toEqual({ error: "Dê um nome ao espaço da família." });
  });

  it("normaliza o e-mail e entra depois de criar o espaço", async () => {
    registerHousehold.mockResolvedValue({ id: "user-1" });
    signIn.mockResolvedValue(undefined);

    await register(
      {},
      formData({
        name: " Ana ",
        email: " Ana@Familia.com ",
        password: "familia123",
        householdName: "Financeiro da família",
      }),
    );

    expect(registerHousehold).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@familia.com",
      password: "familia123",
      householdName: "Financeiro da família",
    });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "ana@familia.com",
      password: "familia123",
      redirectTo: "/",
    });
  });

  it("devolve o erro de e-mail já usado", async () => {
    registerHousehold.mockResolvedValue({ error: "Este e-mail já está cadastrado." });
    await expect(
      register(
        {},
        formData({
          name: "Ana",
          email: "ana@familia.com",
          password: "familia123",
          householdName: "Casa",
        }),
      ),
    ).resolves.toEqual({ error: "Este e-mail já está cadastrado." });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("traduz falha de autenticação e deixa passar os outros erros", async () => {
    registerHousehold.mockResolvedValue({ id: "user-1" });
    signIn.mockRejectedValueOnce(new AuthError("falhou"));
    await expect(
      register(
        {},
        formData({
          name: "Ana",
          email: "ana@familia.com",
          password: "familia123",
          householdName: "Casa",
        }),
      ),
    ).resolves.toEqual({ error: "Não foi possível entrar com esta conta." });

    signIn.mockRejectedValueOnce(new Error("redirect"));
    await expect(
      register(
        {},
        formData({
          name: "Ana",
          email: "ana@familia.com",
          password: "familia123",
          householdName: "Casa",
        }),
      ),
    ).rejects.toThrow("redirect");
  });
});

describe("entrada e saída", () => {
  it("recusa login sem senha", async () => {
    await expect(login({}, formData({ email: "ana@familia.com", password: "" }))).resolves.toEqual({
      error: "Informe a senha.",
    });
  });

  it("diz quando e-mail ou senha não conferem", async () => {
    signIn.mockRejectedValue(new AuthError("credencial"));
    await expect(
      login({}, formData({ email: "ana@familia.com", password: "familia123" })),
    ).resolves.toEqual({ error: "E-mail ou senha incorretos." });
  });

  it("encerra a sessão na tela de entrada", async () => {
    await logout();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/entrar" });
  });
});
