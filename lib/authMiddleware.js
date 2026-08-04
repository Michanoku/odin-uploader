// Middleware used to check access rights for users to different parts and returning the granted access
import { register } from "module";

import * as browserQueries from "../db/browserQueries.js";
import * as sharedQueries from "../db/sharedQueries.js";

// Check if a user is authorized or not
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
};

// Load the folder the user is trying to access, if they have the rights
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

// Load a folder that the user wants to act upon (rename, move, delete, download)
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
};

// The user is not allowed to modify the root folder, so ensure this does not happen
const isTargetRoot = async (req, res, next) => {
  if (req.targetFolder.id === req.user.rootFolderId) {
    const err = new Error("Cannot modify the root folder.");
    err.status = 403;
    return next(err);
  }
  return next();
};

// Load the current shared folder
const loadSharedCurrentFolder = async (req, res, next) => {
  try {
    const sharedFolderId = req.params.sharedFolderId;
    // Check if the folder is shared
    const share = await sharedQueries.getFolderShare(sharedFolderId);
    // If it is shared, the user can access it, so save the information in the req object
    if (share && share.shareId) {
      req.shareId = share.shareId;
      req.sharedFolder = share.sharedFolder;
      req.sharedRootId = share.sharedRootId;
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

// Load the target shared folder (if the user wants to download the folder)
const loadSharedTargetFolder = async (req, res, next) => {
  try {
    const sharedTargetFolderId = req.body.sharedTargetFolderId;
    // Check if the folder is shared
    const share = await sharedQueries.getFolderShare(sharedTargetFolderId);
    // If it is shared, the user can access it, so save the information in the req object
    if (share && share.shareId) {
      req.sharedTargetFolder = share.sharedFolder;
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

// Load a file that the user wants to act upon (access, rename, move, delete, download)
const loadTargetFile = async (req, res, next) => {
  // Set the targetFile to null
  req.targetFile = null;

  const targetFileId = req.body?.fileId ?? req.params?.fileId;

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
};

// Load a shared file that the user wants to access
const loadSharedFile = async (req, res, next) => {
  try {
    const sharedFileId = req.params.sharedFileId;
    // Check if the file is shared
    const share = await sharedQueries.getFileShare(sharedFileId);
    // If yes, add the information to the req object
    if (share && share.sharedFile) {
      req.sharedFile = share.sharedFile;
      if (share.sharedRootId) {
        const folderShare = await sharedQueries.getFolderShare(share.sharedRootId);
        if (folderShare) {
          req.sharedFolder = folderShare.sharedFolder;
          req.sharedRootId = folderShare.sharedRootId;
        }
      }
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

// Load a shared target file that the user wants to download
const loadSharedTargetFile = async (req, res, next) => {
  try {
    const sharedFileId = req.body.sharedFileId;
    // Check if the file is shared
    const share = await sharedQueries.getFileShare(sharedFileId);

    // If yes, add the information to the req object
    if (share && share.sharedFile) {
      req.sharedTargetFile = share.sharedFile;
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
  loadSharedCurrentFolder,
  loadSharedTargetFolder,
  loadSharedFile,
  loadSharedTargetFile,
  loadTargetFile,
};
