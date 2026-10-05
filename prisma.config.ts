import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function withConnectTimeout(url: string | undefined) {
  if (!url) return url;
  if (url.includes("connect_timeout")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=30`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: withConnectTimeout(env("DIRECT_URL")),
  },
});