// PASTE LOCATION: project root (same folder as package.json), NOT inside /prisma
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function withConnectTimeout(url: string | undefined) {
  if (!url) return url;
  return url.includes("connect_timeout") ? url : `${url}&connect_timeout=30`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: withConnectTimeout(env("DIRECT_URL")),
  },
});