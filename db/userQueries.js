// All prisma queries that have to do with the user
import { prisma } from "../lib/prisma.js";

const createUser = async (username, hash) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        hash,
      },
    });

    const rootFolder = await tx.folder.create({
      data: {
        name: "Root",
        userId: user.id,
        parentId: null,
      },
    });

    return await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        rootFolderId: rootFolder.id,
      },
    });
  });
};

const lookupUserByName = async (username) => {
  return await prisma.user.findUnique({
    where: {
      username,
    },
  });
};

const lookupUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
};

export { createUser, lookupUserByName, lookupUserById };
