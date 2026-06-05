import { prisma } from '../lib/prisma.js';

const getFolderContents = async (folderId) => {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: {
        parentId: folderId,
      },
    }),
    prisma.file.findMany({
      where: {
        folderId: folderId,
      },
    }),
  ]);

  return { folders, files };
};

const getRootContents = async (userId) => {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: {
        parentId: null,
        userId: userId,
      },
    }),
    prisma.file.findMany({
      where: {
        folderId: null,
        userId: userId,
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

const createFolderTree = async (folderId, rootId = null) => {
  const tree = [];
  let currentId = folderId;
  do {
    const folder = await prisma.folder.findUnique({
      where: {
        id: currentId,
      },
    });
    if (!folder) break;
    tree.push({ id: folder.id, name: folder.name });
    if (rootId && rootId === currentId) break;
    currentId = folder.parentId;
  } while (currentId !== null);
  return tree.reverse();
};

const getVerifiedSharedFolder = async (folderId) => {
  const sharedFolder = await prisma.sharedFolder.findUnique({
    where: {
      folderId: folderId,
    }
  });
  if (!sharedFolder || sharedFolder.expiresAt < new Date()) {
    return null;
  }
  return sharedFolder;
}

export { getFolder, getFolderContents, getRootContents, createFile, createFolder, createFolderTree, getVerifiedSharedFolder };
