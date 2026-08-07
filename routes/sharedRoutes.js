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

// Shared folder routes
router.get("/shared/all", isAuth, sharedController.getAllShares);
router.get(
  "/shared/folder/:sharedFolderId",
  loadSharedCurrentFolder,
  sharedController.getSharedFolder
);
router.post(
  "/shared/folder/:sharedFolderId/downloadFolder",
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

// Shared file routes
router.get(
  "/shared/file/:sharedFileId",
  loadSharedFile,
  sharedController.getSharedFile
);
router.post(
  "/shared/file/:sharedFileId/downloadFile",
  loadSharedTargetFile,
  sharedController.downloadSharedFile
);
router.post(
  "/shared/folder/:sharedFolderId/downloadFile",
  loadSharedCurrentFolder,
  loadSharedTargetFile,
  sharedController.downloadSharedFile
);
router.post(
  "/browser/folder/:currentFolderId/shareFile",
  isAuth,
  loadCurrentFolder,
  loadTargetFile,
  sharedController.shareFile
);
router.post(
  "/browser/folder/:currentFolderId/unshareFile",
  isAuth,
  loadCurrentFolder,
  loadTargetFile,
  sharedController.unshareFile
);

export default router;
