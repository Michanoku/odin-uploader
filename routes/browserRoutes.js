import express from "express";
import multer from "multer";

import {
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  loadTargetFile,
} from "../lib/authMiddleware.js";
import * as browserController from "../controllers/browserController.js";

const router = express.Router();
// Multer is configured to only allow 1MB at this point (user max 5MB)
const uploadFolder = process.env.NODE_ENV === "test" ? "uploads/test" : "uploads";
const upload = multer({
  dest: uploadFolder,
  limits: {
    fileSize: 1024 * 1024, // 1 MB
  },
});

// Folder routes
router.get("/", browserController.redirectUser);
router.get(
  "/browser/folder/:currentFolderId",
  isAuth,
  loadCurrentFolder,
  browserController.getFolder
);
router.post(
  "/browser/folder/:currentFolderId/createFolder",
  isAuth,
  loadCurrentFolder,
  browserController.createFolder
);
router.post(
  "/browser/folder/:currentFolderId/downloadFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  browserController.downloadFolder
);
router.post(
  "/browser/folder/:currentFolderId/renameFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  browserController.renameFolder
);
router.post(
  "/browser/folder/:currentFolderId/moveFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  browserController.moveFolder
);
router.post(
  "/browser/folder/:currentFolderId/deleteFolder",
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  browserController.deleteFolder
);

// File routes
router.post(
  "/browser/folder/:currentFolderId/upload",
  isAuth,
  loadCurrentFolder,
  upload.single("file"),
  browserController.uploadFile
);
router.post(
  "/browser/folder/:currentFolderId/downloadFile",
  isAuth,
  loadCurrentFolder,
  loadTargetFile,
  browserController.downloadFile
);
router.get(
  "/browser/file/:fileId",
  isAuth,
  loadTargetFile,
  browserController.getFile
);
router.post(
  "/browser/folder/:currentFolderId/renameFile",
  isAuth,
  loadCurrentFolder,
  loadTargetFile,
  browserController.renameFile
);
router.post(
  "/browser/folder/:currentFolderId/moveFile",
  isAuth,
  loadTargetFile,
  browserController.moveFile
);
router.post(
  "/browser/folder/:currentFolderId/deleteFile",
  isAuth,
  loadTargetFile,
  browserController.deleteFile
);

export default router;
