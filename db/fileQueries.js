import { prisma } from "../lib/prisma.js";

const createFile = async (fileData) => {
  const file = await prisma.file.create({
    data: fileData,
  });
  return file;
};

export {
  createFile,
};
