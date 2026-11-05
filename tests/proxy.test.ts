import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(pathname: string, cookieNames: string[] = []) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      getAll: () => cookieNames.map((name) => ({ name, value: "token" })),
    },
  } as unknown as NextRequest;
}

function location(response: Response) {
  return response.headers.get("location");
}

describe("proteção das rotas", () => {
  it("deixa passar a autenticação e as telas públicas sem sessão", () => {
    expect(proxy(request("/api/auth/session")).status).toBe(200);
    expect(proxy(request("/entrar")).status).toBe(200);
    expect(proxy(request("/cadastrar")).status).toBe(200);
  });

  it("envia quem não entrou para a tela de login", () => {
    const response = proxy(request("/contas"));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("http://localhost:3000/entrar");
  });

  it("reconhece o cookie da sessão, inclusive quando ele vem partido", () => {
    expect(proxy(request("/", ["authjs.session-token"])).status).toBe(200);
    expect(proxy(request("/agenda", ["authjs.session-token.0"])).status).toBe(200);
  });

  it("não mostra login para quem já está no espaço", () => {
    const response = proxy(request("/entrar", ["__Secure-authjs.session-token"]));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("http://localhost:3000/");
  });
});
