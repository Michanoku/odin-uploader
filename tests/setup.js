import "../config/env.js";
import { prisma } from "../lib/prisma.js";

beforeAll(async () => {
  await prisma.share.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
