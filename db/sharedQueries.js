// All prisma queries that have to do with sharing files and folders
import { prisma } from "../lib/prisma.js";

// Folders
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

const getAllFilesFromSubfolders = async (folderIds) => {
  const files = await prisma.file.findMany({
    where: {
      folderId: {
        in: folderIds,
      },
    },
    select: {
      id: true,
    },
  });
  return files;
};

const shareFolder = async (folderId, duration) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

  const folderIds = await collectFolderIds(folderId);
  const fileIds = await getAllFilesFromSubfolders(folderIds);

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

  if (!share) {
    return null;
  }

  return prisma.share.delete({
    where: {
      id: share.id,
    },
  });
};

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
  const shareId = share.id;
  const sharedFolder = share.folders[0];
  const sharedRootId = share.rootFolderId;
  return { shareId, sharedFolder, sharedRootId };
};

// Files
const shareFile = async (fileId, duration) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

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

const unshareFile = async (fileId) => {
  const share = await prisma.share.findFirst({
    where: {
      files: {
        some: {
          id: fileId,
        },
      },
    },
  });

  if (!share) {
    return null;
  }

  return prisma.share.delete({
    where: {
      id: share.id,
    },
  });
};

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
