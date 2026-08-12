import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Database file path. Primary is the process working directory (the dev
 * server and scripts always run from the project root, where dev.db lives).
 * If that directory is unusable (e.g. a server started from an unrelated
 * cwd), fall back to the module-anchored path so we never silently create
 * a second, empty database file in a random directory — which is what made
 * entered data appear to "disappear" after a restart.
 *
 * Note: __dirname is only trustworthy outside Turbopack's bundler, hence
 * the existence check before using it.
 */
const DB_PATH = (() => {
  const cwdPath = path.join(process.cwd(), "dev.db");
  if (fs.existsSync(path.dirname(cwdPath))) return cwdPath;
  try {
    const modulePath = path.resolve(__dirname, "..", "..", "dev.db");
    if (fs.existsSync(path.dirname(modulePath))) return modulePath;
  } catch {
    // __dirname not available in this runtime
  }
  return cwdPath;
})();

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: DB_PATH,
  });

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}