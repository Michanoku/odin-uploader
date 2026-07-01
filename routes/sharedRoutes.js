import express from "express";
import {
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isSharedFolder,
  isSharedDescendant,
  loadTargetFile,
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
  "/shared/:sharedFolderId/folder/:sharedDescendantId",
  isAuth,
  isSharedFolder,
  isSharedDescendant,
  sharedController.getSharedFolder
);
router.post(
  "/browser/folder/:currentFolderId/shareFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  sharedController.shareFolder
);

// Files
// router.get(
//   "/shared/:sharedFolderId/file/:fileId",
//   isAuth,
//   isSharedFolder,
//   isSharedFile,
//   sharedController.getSharedFile
// );
router.post("/shareFile", isAuth, loadTargetFile, sharedController.shareFile);

export default router;
