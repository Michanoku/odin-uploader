// All prisma queries that have to do with the user
import { prisma } from "../lib/prisma.js";

// Create a new user with the email and the hash provided
const createUser = async (email, hash) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        hash,
      },
    });

    // Create a root folder for the user and assign it to them
    const rootFolder = await tx.folder.create({
      data: {
        name: "Root",
        userId: user.id,
        parentId: null,
      },
    });

    // Update the user with the newly created root folder
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

const updateUser = async (id, email, hash) => {
   const data = {};

    if (email) {
      data.email = email;
    }

    if (hash) {
      data.hash = hash;
    }
  return await prisma.user.update({
    where: { id },
    data,
  })
}

// Look up a user by their name
const lookupUserByName = async (email) => {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
};

// Look up a user by their ID
const lookupUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
};

export { createUser, lookupUserByName, lookupUserById, updateUser };
