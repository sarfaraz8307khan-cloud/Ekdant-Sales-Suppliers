import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const db = new PrismaClient({ adapter });

async function main() {
  const settings = await db.applicationSettings.findUnique({
    where: { id: "default" },
  });
  const maxTyre = await db.tyre.findFirst({
    orderBy: { internalId: "desc" },
    select: { internalId: true },
  });
  console.log("tyreIdNextSeq:", settings?.tyreIdNextSeq);
  console.log("max tyre:", maxTyre?.internalId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });