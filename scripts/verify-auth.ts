import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { loginId: "admin" } });
  if (!user) {
    console.log("✗ ADMIN USER NOT FOUND");
    process.exit(1);
  }
  const ok = await bcrypt.compare("admin123", user.passwordHash);
  console.log("admin user found:", user.id);
  console.log("admin123 matches hash:", ok);
  console.log("status:", user.status);
  console.log("passwordHash prefix:", user.passwordHash.slice(0, 7));
  if (!ok) process.exit(1);
  console.log("✓ ADMIN LOGIN CREDENTIALS VALID");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());