// Test setup, get envs and erase the entire test database everytime. Disconnect after.
import fs from "fs/promises";
import path from "path";

import "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { supabase } from "../config/supabase.js";

beforeAll(async () => {
  await prisma.share.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  const { data: files, error } = await supabase.storage
    .from("User Files")
    .list("Test");

  if (error) {
    throw error;
  }

  if (files.length > 0) {
    const paths = files.map((file) => `Test/${file.name}`);

    const { error } = await supabase.storage.from("User Files").remove(paths);

    if (error) {
      throw error;
    }
  }

  await prisma.$disconnect();
});
