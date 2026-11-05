import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applySessionUser, authorizeCredentials } from "@/modules/auth/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: (credentials) =>
        authorizeCredentials(credentials, {
          findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
          comparePassword: (password, hash) => bcrypt.compare(password, hash),
        }),
    }),
  ],
  callbacks: {
    session({ session, token }) {
      return applySessionUser(session, token);
    },
  },
});
