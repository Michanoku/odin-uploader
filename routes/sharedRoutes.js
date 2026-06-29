import express from "express";
import {
  isAuth,
  loadCurrentFolder,
  isSharedFolder,
  isSharedDescendant,
  isFileOwner,
  isSharedFile,
} from "../lib/authMiddleware.js";
import * as sharedController from "../controllers/sharedController.js";

const router = express.Router();

// Folders
router.get(
  "/shared/:sharedFolderId",
  isAuth,
  isSharedFolder,
  sharedController.getSharedFolder
);
router.get(
  "/shared/:sharedFolderId/folder/:folderId",
  isAuth,
  isSharedFolder,
  isSharedDescendant,
  sharedController.getSharedFolder
);
router.post("/shareFolder", isAuth, loadCurrentFolder, sharedController.shareFolder);

// Files
// router.get(
//   "/shared/:sharedFolderId/file/:fileId",
//   isAuth,
//   isSharedFolder,
//   isSharedFile,
//   sharedController.getSharedFile
// );
router.post("/shareFile", isAuth, isFileOwner, sharedController.shareFile);

export default router;
