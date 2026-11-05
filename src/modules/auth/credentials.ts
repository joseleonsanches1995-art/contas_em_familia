import { z } from "zod";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export async function authorizeCredentials(
  credentials: unknown,
  deps: {
    findUserByEmail: (email: string) => Promise<AuthUser | null>;
    comparePassword: (password: string, hash: string) => Promise<boolean>;
  },
) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await deps.findUserByEmail(parsed.data.email.toLowerCase());
  if (!user) return null;

  const passwordMatches = await deps.comparePassword(
    parsed.data.password,
    user.passwordHash,
  );
  if (!passwordMatches) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export function applySessionUser<T extends { user?: { id?: string } | null }>(
  session: T,
  token: { sub?: string | null },
): T {
  if (session.user && token.sub) {
    session.user.id = token.sub;
  }
  return session;
}
