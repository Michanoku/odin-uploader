import { prisma } from "../lib/prisma.js";

const getFolderContents = async (folderId, userId) => {
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
const getFolder = async (folderId, userId) => {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
    });
    return folder;
  }

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

const createFolderTree = async (folderId) => {
    const tree = [];
    let currentId = folderId;
    do {
        const folder = await prisma.folder.findUnique({
            where: {
                id: currentId,
            }
        });
        if (!folder) break;
        tree.push({ id: folder.id, name: folder.name});
        currentId = folder.parentId;
    } while (currentId !== null);
    return tree.reverse();
}

export { getFolder, getFolderContents, createFile, createFolder, createFolderTree };
