import { prisma } from "../lib/prisma.js";

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

const createFolder = async (folderData) => {
  const folder = await prisma.folder.create({
    data: folderData,
  });
  return folder;
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

const updateFolder = async (folderId, updatedFolderData) => {
  const updatedFolder = await prisma.folder.update({
    where: {
      id: folderId,
    },
    data: updatedFolderData,
  });
  return updatedFolder;
};

const deleteFolder = async (folderId) => {
  const deletedFolder = await prisma.folder.delete({
    where: {
      id: folderId,
    },
  });
  return deletedFolder;
};

const shareFolder = async (folderId, duration) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

  const sharedFolder = await prisma.sharedFolder.create({
    data: {
      folderId: folderId,
      expiresAt: expiresAt,
    },
  });
  return sharedFolder;
};

const createFolderTree = async (folderId, rootId = null) => {
  const tree = [];
  let currentId = folderId;
  while (currentId !== null) {
    const folder = await prisma.folder.findUnique({
      where: {
        id: currentId,
      },
    });
    if (!folder) break;
    tree.push({ id: folder.id, name: folder.name });
    if (rootId && rootId === currentId) break;
    currentId = folder.parentId;
  }
  return tree.reverse();
};

const getVerifiedSharedFolder = async (folderId) => {
  const sharedFolder = await prisma.sharedFolder.findUnique({
    where: {
      folderId: folderId,
    },
  });
  if (!sharedFolder || sharedFolder.expiresAt < new Date()) {
    return null;
  }
  return sharedFolder;
};

const isDescendant = async (folderId, sharedFolderId) => {
  let currentId = folderId;

  while (currentId !== null) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
    });

    if (!folder) return false;

    if (folder.id === sharedFolderId) return true;

    currentId = folder.parentId;
  }

  return false;
};

export {
  getFolder,
  getFolderContents,
  getRootContents,
  createFolder,
  updateFolder,
  deleteFolder,
  shareFolder,
  createFolderTree,
  getVerifiedSharedFolder,
  isDescendant,
};
