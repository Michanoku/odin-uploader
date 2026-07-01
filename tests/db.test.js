import { prisma } from "../lib/prisma.js";

test("db connection", async () => {
  await expect(prisma.$connect()).resolves.not.toThrow();
});
