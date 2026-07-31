// All prisma queries that have to do with the users own files and folders
import { prisma } from "../lib/prisma.js";

// Queries for folders
// Get a single folder
const getFolder = async ({ folderId, userId = null }) => {
  if (!folderId) {
    throw new Error("getFolder called without folderId");
  }

  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      ...(userId && { userId }),
    },
    include: {
      rootShare: true,
    },
  });

  return folder;
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

// Check if a file of the same name exists in the same folder
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

// Get all subfolders of a folder, but only direct children
const getAllSubfolders = async (folderId) => {
  return prisma.folder.findMany({
    where: {
      parentId: folderId,
    },
    include: {
      rootShare: true,
    },
  });
};

// Get all files of a folder, but only direct children
const getAllFiles = async (folderId) => {
  return prisma.file.findMany({
    where: {
      folderId: folderId,
    },
    include: {
      rootShare: true,
    },
  });
};

// Create a new folder from the provided data
const createFolder = async (folderData) => {
  const folder = await prisma.folder.create({
    data: folderData,
  });
  return folder;
};

// Update the folder with the new data
const updateFolder = async (folderId, updatedFolderData) => {
  const updatedFolder = await prisma.folder.update({
    where: {
      id: folderId,
    },
    data: updatedFolderData,
  });
  return updatedFolder;
};

// Delete the folder
const deleteFolder = async (folderId) => {
  const deletedFolder = await prisma.folder.delete({
    where: {
      id: folderId,
    },
  });
  return deletedFolder;
};

// Get all ids from subfolders, even within other subfolders
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

  // Recursion (Dang I can't believe I'm actually using recursion in my own project after all this time!)
  for (const child of children) {
    ids.push(...(await collectFolderIds(child.id)));
  }

  return ids;
};

// Check if a folder is a descendant of another folder
const isDescendant = async (folderId, targetId) => {
  const children = await prisma.folder.findMany({
    where: {
      parentId: folderId,
    },
    select: {
      id: true,
    },
  });

  for (const child of children) {
    if (child.id === targetId) {
      return true;
    }

    if (await isDescendant(child.id, targetId)) {
      return true;
    }
  }

  return false;
};

// Queries for files
// Get a single file
const getFile = async ({ fileId, userId }) => {
  const where = {
    id: fileId,
    userId: userId,
  };
  return await prisma.file.findFirst({ where, include: { rootShare: true } });
};

// Create a new file using the data
const createFile = async (fileData) => {
  const file = await prisma.file.create({
    data: fileData,
  });
  return file;
};

// Update the file using the new data
const updateFile = async (fileId, updatedFileData) => {
  const updatedFile = await prisma.file.update({
    where: {
      id: fileId,
    },
    data: updatedFileData,
  });
  return updatedFile;
};

// Delete the file
const deleteFile = async (fileId) => {
  const deletedFile = await prisma.file.delete({
    where: {
      id: fileId,
    },
  });
  return deletedFile;
};

// Check combined size of current users files
const calculateTotalSize = async (userId) => {
  const currentSize = await prisma.file.aggregate({
    where: {
      folder: {
        userId: userId,
      },
    },
    _sum: {
      size: true,
    },
  });
  return currentSize._sum.size ?? 0;
};

// Get all files in all folders provided
const getAllFilesFromSubfolders = async (folderIds) => {
  const files = await prisma.file.findMany({
    where: {
      folderId: {
        in: folderIds,
      },
    },
    select: {
      id: true,
      filename: true,
    },
  });
  return files;
};

// Get all the contents of a folder, include filenames and original names for files
const getFolderContentWithPaths = async (folderId) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      files: {
        select: {
          originalname: true,
          filename: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return folder;
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
  collectFolderIds,
  isDescendant,
  getFile,
  createFile,
  updateFile,
  deleteFile,
  calculateTotalSize,
  getAllFilesFromSubfolders,
  getFolderContentWithPaths,
};
