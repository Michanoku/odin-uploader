// Simple prisma DB test
import { prisma } from "../lib/prisma.js";

// Simple DB connection test
test("db connection", async () => {
  await expect(prisma.$connect()).resolves.not.toThrow();
});
