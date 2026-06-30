import { prisma } from "../lib/prisma.js";

// Folders
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

const getSharedRoot = async (folderId) => {
  const sharedFolder = await prisma.sharedFolder.findFirst({
    where: {
      folderId: folderId,
    },
  });
  if (!sharedFolder || sharedFolder.expiresAt < new Date()) {
    return null;
  }
  return sharedFolder;
};

const isSharedFolder = async (folderId, sharedFolderId) => {
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

// Files
const isSharedFile = async (fileId, sharedFolderId) => {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
    },
  });
  let currentId = file.folderId;

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

const isDescendant = async (folderId, sharedFolderId) => {
  let currentId = folderId;

  while (currentId !== null) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
    });
    if (!folder) return false;

    if (folder.id === sharedFolderId) {
      return await prisma.folder.findFirst({
        where: {
          id: folderId,
        },
      });
    }
    currentId = folder.parentId;
  }

  return false;
};

export {
  shareFolder,
  getSharedRoot,
  isSharedFolder,
  isSharedFile,
  isDescendant,
};
