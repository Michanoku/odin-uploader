// All prisma queries that have to do with sharing files and folders
import { prisma } from "../lib/prisma.js";
import {
  collectFolderIds,
  getAllFilesFromSubfolders,
} from "./browserQueries.js";

// Queries for shared folders
// Share a folder and add all of its children and contained files to the share model object
const shareFolder = async (folderId, duration) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

  // Get folder ids from all subfolders and then get the files within the folders
  const folderIds = await collectFolderIds(folderId);
  const fileIds = await getAllFilesFromSubfolders(folderIds);
  
  // Since we are creating a new share, check for existing shares within and unshare if found
  await Promise.all([
    ...folderIds.map(id => unshareFolder(id)),
    ...fileIds.map(id => unshareFile(id)),
  ]);

  const share = await prisma.share.create({
    data: {
      rootFolderId: folderId,
      expiresAt,
      folders: {
        connect: folderIds.map((id) => ({ id })),
      },
      files: {
        connect: fileIds,
      },
    },
  });
  return share;
};

// Unshare a folder
const unshareFolder = async (folderId) => {
  const share = await prisma.share.findFirst({
    where: {
      folders: {
        some: {
          id: folderId,
        },
      },
    },
  });

  if (!share) return;

  // Avoid race conditions
  await prisma.share.deleteMany({
    where: {
      id: share.id,
    },
  });
};

// Get the share object associated with a folder
const getFolderShare = async (folderId) => {
  const share = await prisma.share.findFirst({
    where: {
      folders: {
        some: {
          id: folderId,
        },
      },
    },
    include: {
      folders: {
        where: {
          id: folderId,
        },
      },
    },
  });
  if (!share || share.expiresAt < new Date()) {
    return null;
  }
  // Return the id of the share, the folder the user wants to access as well as the ID of the share root
  const shareId = share.id;
  const sharedFolder = share.folders[0];
  const sharedRootId = share.rootFolderId;
  return { shareId, sharedFolder, sharedRootId };
};

// Queries for files
// Share a file
const shareFile = async (fileId, duration) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

  // Single files are simple, create the share object with the file as the root sole id in files
  const share = await prisma.share.create({
    data: {
      rootFileId: fileId,
      expiresAt,
      files: {
        connect: { id: fileId },
      },
    },
  });
  return share;
};

// Unshare a file
const unshareFile = async (fileId) => {
  // Find the share associated with the file
  const share = await prisma.share.findFirst({
    where: {
      files: {
        some: {
          id: fileId,
        },
      },
    },
  });

  if (!share) return;

  // Avoid race conditions
  await prisma.share.deleteMany({
    where: {
      id: share.id,
    },
  });
};

// Get the share for a file.
const getFileShare = async (fileId) => {
  const share = await prisma.share.findFirst({
    where: {
      files: {
        some: {
          id: fileId,
        },
      },
    },
    include: {
      files: {
        where: {
          id: fileId,
        },
      },
    },
  });
  if (!share || share.expiresAt < new Date()) {
    return null;
  }
  // Return the id and the file, but also return the folder id if the share happens to have a higher root
  const result = {
    shareId: share.id,
    sharedFile: share.files[0],
  };
  if (share.rootFolderId) {
    result.sharedRootId = share.rootFolderId;
  }

  return result;
};

export {
  shareFolder,
  unshareFolder,
  getFolderShare,
  shareFile,
  unshareFile,
  getFileShare,
};
