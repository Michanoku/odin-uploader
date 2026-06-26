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
  return await prisma.folder.findFirst({ where });
};

// Check if a folder of the same name exists in the same folder
const folderExists = async ({ name, userId, parentId }) => {
  const folder = await prisma.folder.findFirst({
    where: {
      name,
      userId,
      parentId: parentId === "" ? null : parentId,
    },
    select: {
      id: true,
    },
  });

  return !!folder;
};

const fileExists = async ({ originalname, userId, folderId }) => {
  const file = await prisma.file.findFirst({
    where: {
      originalname,
      userId,
      folderId: folderId === "" ? null : folderId,
    },
    select: {
      id: true,
    },
  });

  return !!file;
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
  // TODO: DELETE PHYSICAL FILES AND FOLDERS WITHIN
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
  return await prisma.file.findFirst({ where });
};

const createFile = async (fileData) => {
  const file = await prisma.file.create({
    data: fileData,
  });
  return file;
};

const updateFile = async (fileId, updatedFileData) => {
  const updatedFile = await prisma.file.update({
    where: {
      id: fileId,
    },
    data: updatedFileData,
  });
  return updatedFile;
};

const deleteFile = async (fileId) => {
  const deletedFile = await prisma.file.delete({
    where: {
      id: fileId,
    },
  });
  return deletedFile;
};

// Get all subfolders, even within other subfolders
const collectFolderIds = async (folderId) => {
  const children = await prisma.folder.findMany({
    where: {
      parentId: folderId,
    },
    select: {
      id: true,
    },
  });

  const ids = [folderId];

  for (const child of children) {
    ids.push(...(await collectFolderIds(child.id)));
  }

  return ids;
};

const getAllFilesFromSubfolders = async (folderId) => {
  const folderIds = await collectFolderIds(folderId);

  const files = await prisma.file.findMany({
    where: {
      folderId: {
        in: folderIds,
      },
    },
    select: {
      filename: true,
    },
  });
  return files;
};

export {
  getFolder,
  folderExists,
  fileExists,
  getAllFiles,
  getAllSubfolders,
  createFolder,
  updateFolder,
  deleteFolder,
  isDescendant,
  getFile,
  createFile,
  updateFile,
  deleteFile,
  getAllFilesFromSubfolders,
};
