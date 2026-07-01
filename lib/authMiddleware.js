import { register } from "module";
import * as browserQueries from "../db/browserQueries.js";
import * as sharedQueries from "../db/sharedQueries.js";
import { convertProcessSignalToExitCode } from "util";

// Check if a user is authorized or not
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
};

const loadCurrentFolder = async (req, res, next) => {
  // Set the currentFolder to null
  req.currentFolder = null;
  res.locals.currentFolder = null;

  // If no folder id was passed in params, keep going
  if (!req.params.currentFolderId) {
    return next();
  }

  // If a folderId was passed, check if the user owns the folder
  try {
    const folder = await browserQueries.getFolder({
      folderId: req.params.currentFolderId,
      userId: req.user.id,
    });

    // If no folder was found, return 404
    if (!folder) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }

    // If found, set as currentFolder
    req.currentFolder = folder;
    res.locals.currentFolder = folder;
    return next();
  } catch (err) {
    return next(err);
  }
};

const loadTargetFolder = async (req, res, next) => {
  // Set the targetFolder to null
  req.targetFolder = null;

  // If no folder id was passed in body, keep going
  if (!req.body.folderId) {
    return next();
  }

  // If a folderId was passed, check if the user owns the folder
  try {
    const folder = await browserQueries.getFolder({
      folderId: req.body.folderId,
      userId: req.user.id,
    });

    // If no folder was found, return 404
    if (!folder) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }

    // If found, set as targetFolder
    req.targetFolder = folder;
    return next();
  } catch (err) {
    return next(err);
  }
}

const isTargetRoot = async (req, res, next) => {
  if (req.targetFolder.id === req.user.rootFolderId) {
    const err = new Error("Cannot modify the root folder.");
    err.status = 403;
    return next(err);
  } 
  return next();
}

// Check if a folder is shared or not
const isSharedFolder = async (req, res, next) => {
  try {
    const sharedFolderId = req.params.sharedFolderId;
    const sharedFolder = await sharedQueries.getSharedRoot(sharedFolderId);
    if (sharedFolder) {
      req.sharedFolder = sharedFolder;
      return next();
    } else {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

const isSharedDescendant = async (req, res, next) => {
  try {
    const sharedFolderId = req.sharedFolder.folderId;
    const folderId = req.params.sharedDescendantId;
    const currentFolder = await sharedQueries.isDescendant(folderId, sharedFolderId)
    if (currentFolder) {
      req.sharedDescendant = currentFolder;
      return next();
    } else {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

const loadTargetFile = async (req, res, next) => {
  // Set the targetFile to null
  req.targetFile = null;
  
  const targetFileId =
    req.body?.fileId ??
    req.params?.fileId;

  // If no file Id was passed in body, keep going
  if (!targetFileId) {
    return next();
  }

  // If a fileId was passed, check if the user owns the file
  try {
    const file = await browserQueries.getFile({
      fileId: targetFileId,
      userId: req.user.id,
    });

    // If no folder was found, return 404
    if (!file) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }

    // If found, set as targetFolder
    req.targetFile = file;
    return next();
  } catch (err) {
    return next(err);
  }
}

const isSharedFile = async (req, res, next) => {
  try {
    const sharedFolderId = req.params.sharedFolderId;
    const fileId = req.params.fileId;
    if (await sharedQueries.isSharedFile(fileId, sharedFolderId)) {
      return next();
    } else {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};


export {
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  isSharedFolder,
  isSharedDescendant,
  isSharedFile,
  loadTargetFile,
};
