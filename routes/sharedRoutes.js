import express from "express";

import {
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  loadSharedCurrentFolder,
  loadSharedTargetFolder,
  loadTargetFile,
  loadSharedFile,
  loadSharedTargetFile,
} from "../lib/authMiddleware.js";
import * as sharedController from "../controllers/sharedController.js";

const router = express.Router();

// Folders
router.get(
  "/shared/folder/:sharedFolderId",
  isAuth,
  loadSharedCurrentFolder,
  sharedController.getSharedFolder
);
router.post(
  "/shared/folder/:sharedFolderId/downloadFolder",
  isAuth,
  loadSharedCurrentFolder,
  loadSharedTargetFolder,
  sharedController.downloadSharedFolder
);
router.post(
  "/browser/folder/:currentFolderId/shareFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  sharedController.shareFolder
);
router.post(
  "/browser/folder/:currentFolderId/unshareFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  sharedController.unshareFolder
);

// Files
router.get(
  "/shared/file/:sharedFileId",
  isAuth,
  loadSharedFile,
  sharedController.getSharedFile
);
router.post(
  "/shared/file/:sharedFileId/downloadFile",
  isAuth,
  loadSharedTargetFile,
  sharedController.downloadSharedFile
);
router.post(
  "/shared/folder/:sharedFolderId/downloadFile",
  isAuth,
  loadSharedCurrentFolder,
  loadSharedTargetFile,
  sharedController.downloadSharedFile
);
router.post("/browser/folder/:currentFolderId/shareFile", isAuth, loadCurrentFolder, loadTargetFile, sharedController.shareFile);
router.post("/browser/folder/:currentFolderId/unshareFile", isAuth, loadCurrentFolder, loadTargetFile, sharedController.unshareFile);

export default router;
