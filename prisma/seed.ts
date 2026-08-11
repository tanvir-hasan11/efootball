import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding is disabled: no demo data is created. Use the app to register accounts and create tournaments.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());