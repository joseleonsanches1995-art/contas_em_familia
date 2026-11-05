import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

// Migrations prefer the direct Neon connection. Generate only needs a URL when
// one exists, so a Vercel install can run without DIRECT_URL.
const datasourceUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
});
