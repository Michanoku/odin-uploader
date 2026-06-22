import { prisma } from "../lib/prisma.js";

// Folders
const getFolder = async ({ folderId, userId = null }) => {
  const where = {
    id: folderId,
  }; 
  if (userId !== null) {
    // If a userid is passed, include it in the query
    where.userId = userId;
  } 
  return await prisma.folder.findFirst({where});
};

const getAllSubfolders = async ({ folderId = null, userId = null }) => {
  const where = {};

  if (folderId !== null) {
    // If a folder id is passed, look for children of that folder
    where.parentId = folderId;
  } else {
    // If no folder id is passed, look for children of the users root
    where.parentId = null;
    where.userId = userId;
  }

  return prisma.folder.findMany({ where });
};

const getAllFiles = async ({ folderId = null, userId = null }) => {
  const where = {};

  if (folderId !== null) {
    // If a folder id is passed, look for files in that folder
    where.folderId = folderId;
  } else {
    // If no folder id is passed, look for files in the users root
    where.folderId = null;
    where.userId = userId;
  }

  return prisma.file.findMany({ where });
};

const createFolder = async (folderData) => {
  const folder = await prisma.folder.create({
    data: folderData,
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

// Files
const getFile = async ({ fileId, userId }) => {
  const where = {
    id: fileId,
    userId: userId,
  }; 
  return await prisma.file.findFirst({where});
};

const createFile = async (fileData) => {
  const file = await prisma.file.create({
    data: fileData,
  });
  return file;
};

export {
    getFolder,
    getAllFiles,
    getAllSubfolders,
    createFolder,
    updateFolder,
    deleteFolder,
    isDescendant,
    getFile,
    createFile,
};
