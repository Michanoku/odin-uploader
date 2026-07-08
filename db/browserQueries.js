// All prisma queries that have to do with the users own files and folders
import { prisma } from "../lib/prisma.js";

// Queries for folders
// Get a single folder
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
  });
};

// Get all files  of a folder, but only direct children
const getAllFiles = async (folderId) => {
  return prisma.file.findMany({
    where: {
      folderId: folderId,
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

// Queries for files
// Get a single file
const getFile = async ({ fileId, userId }) => {
  const where = {
    id: fileId,
    userId: userId,
  };
  return await prisma.file.findFirst({ where });
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
  getFile,
  createFile,
  updateFile,
  deleteFile,
  collectFolderIds,
  getAllFilesFromSubfolders,
  getFolderContentWithPaths,
};
