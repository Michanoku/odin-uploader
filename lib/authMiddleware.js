import * as db from '../db/fileQueries.js';

// Check if a user is authorized or not
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect('/login');
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
      return res.redirect('/notfound'); // TODO
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

export { isAuth, isShared };
