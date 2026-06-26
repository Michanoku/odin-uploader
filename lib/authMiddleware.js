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

const isFolderOwner = async (req, res, next) => {
  let folderId;
  if (req.params.folderId) {
    folderId = req.params.folderId;
  } else if (req.body.folderId) {
    folderId = req.body.folderId;
  } else {
    const err = new Error("Not Found");
    err.status = 404;
    return next(err);
  }
  console.log("Folder ID as perceived by AUTH ", folderId);
  try {
    const folder = await browserQueries.getFolder({
      folderId,
      userId: req.user.id,
    });
    if (!folder) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }
    req.folder = folder;
    return next();
  } catch (err) {
    return next(err);
  }
};

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
    const sharedFolderId = req.params.sharedFolderId;
    const folderId = req.params.folderId;
    if (await browserQueries.isDescendant(folderId, sharedFolderId)) {
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

const isFileOwner = async (req, res, next) => {
  let fileId;
  if (req.params.fileId) {
    fileId = req.params.fileId;
  } else if (req.body.fileId) {
    fileId = req.body.fileId;
  } else {
    const err = new Error("Not Found");
    err.status = 404;
    return next(err);
  }
  try {
    const file = await browserQueries.getFile({ fileId, userId: req.user.id });
    if (!file) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    } else {
      req.file = file;
      return next();
    }
  } catch (err) {
    return next(err);
  }
};

export {
  isAuth,
  isFolderOwner,
  isSharedFolder,
  isSharedDescendant,
  isSharedFile,
  isFileOwner,
};
