// Test setup, get envs and erase the entire test database everytime. Disconnect after.
import fs from "fs/promises";
import path from "path";

import "../config/env.js";
import { prisma } from "../lib/prisma.js";

beforeAll(async () => {
  await prisma.share.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  const uploadDir = path.resolve("uploads/test");

  const files = await fs.readdir(uploadDir);

  await Promise.all(files.map((file) => fs.unlink(path.join(uploadDir, file))));
  await prisma.$disconnect();
});
