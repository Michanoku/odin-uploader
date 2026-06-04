import { prisma } from "../lib/prisma.js";

const getFolder = async (folderId, userId) => {
  if (folderId !== null) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
    });
    if (!folder) {
      return null;
    }
  }

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: {
        userId: userId,
        parentId: folderId,
      },
    }),
    prisma.file.findMany({
      where: {
        userId: userId,
        folderId: folderId,
      },
    }),
  ]);

  return { folders, files };
};

const createFile = async (fileData) => {
  const file = await prisma.file.create({
    data: fileData,
  });
  return file;
};

const createFolder = async (folderData) => {
  const folder = await prisma.folder.create({
    data: folderData,
  });
  return folder;
};

export { getFolder, createFile, createFolder };
