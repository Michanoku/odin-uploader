import * as db from "../db/fileQueries.js";

// Check if a user is authorized or not
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
};

const isOwner = async (req, res, next) => {
  let folderId;
  if (req.params.folderId) {
    folderId = req.params.folderId;
  } else if (req.body.folderId) {
    folderId = req.body.folderId;
  } else {
    return res.redirect("/notfound"); //TODO
  }
  try {
    const folder = await db.getFolder(folderId);
    if (!folder) return res.rediret("/notfound");
    if (folder.userId === req.user.id) {
      req.folder = folder;
      return next();
    } else {
      return res.redirect("/notfound"); //TODO
    }
  } catch (err) {
    return next(err);
  }
};

// Check if a folder is shared or not
const isShared = async (req, res, next) => {
  try {
    const sharedFolderId = req.params.sharedFolderId;
    const sharedFolder = await db.getVerifiedSharedFolder(sharedFolderId);
    if (sharedFolder) {
      req.sharedFolder = sharedFolder;
      return next();
    } else {
      return res.redirect("/notfound"); // TODO
    }
  } catch (err) {
    return next(err);
  }
};

export { isAuth, isOwner, isShared };
