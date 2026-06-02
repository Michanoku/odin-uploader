// All prisma queries that have to do with the user
import { prisma } from "../lib/prisma.js";

const createUser = async (username, hash) => {
  return await prisma.user.create({
    data: {
      username,
      hash,
    },
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
