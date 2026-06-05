import * as folderQueries from "../db/folderQueries.js";

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
  try {
    const folder = await folderQueries.getFolder(folderId);
    if (!folder) {
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    } 
    if (folder.userId === req.user.id) {
      req.folder = folder;
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

// Check if a folder is shared or not
const isSharedFolder = async (req, res, next) => {
  try {
    const sharedFolderId = req.params.sharedFolderId;
    const sharedFolder = await folderQueries.getVerifiedSharedFolder(sharedFolderId);
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
    if (await folderQueries.isDescendant(folderId, sharedFolderId)) {
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
    const file = await fileQueries.getFile(fileId);
    if (!file) { 
      const err = new Error("Not Found");
      err.status = 404;
      return next(err);
    }
    if (file.userId === req.user.id) {
      req.file = file;
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

export { isAuth, isFolderOwner, isSharedFolder, isSharedDescendant, isFileOwner };
