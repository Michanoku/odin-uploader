import express from "express";
const router = express.Router();
import multer from "multer";
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});
import {
  isAuth,
  loadCurrentFolder,
  loadTargetFolder,
  isTargetRoot,
  loadTargetFile,
} from "../lib/authMiddleware.js";
import * as browserController from "../controllers/browserController.js";

// Folders
router.get("/browser", isAuth, browserController.redirectToRoot);
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

// Files
router.post(
  "/browser/folder/:currentFolderId/upload",
  isAuth,
  loadCurrentFolder,
  upload.single("file"),
  browserController.uploadFile
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
