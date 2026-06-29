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
  isFileOwner,
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
router.post("/browser/folder/:currentFolderId/createFolder", isAuth, loadCurrentFolder, browserController.createFolder);
router.post("/browser/folder/:currentFolderId/renameFolder", isAuth, loadCurrentFolder, loadTargetFolder, isTargetRoot, browserController.renameFolder);
router.post("/browser/folder/:currentFolderId/moveFolder", isAuth, loadCurrentFolder, loadTargetFolder, isTargetRoot, browserController.moveFolder);
router.post("/browser/folder/:currentFolderId/deleteFolder", isAuth, loadCurrentFolder, loadTargetFolder, isTargetRoot, browserController.deleteFolder);

// Files
router.post(
  "/browser/folder/:currentFolderId/upload",
  isAuth,
  upload.single("file"),
  browserController.uploadFile
);
router.get(
  "/browser/file/:fileId",
  isAuth,
  isFileOwner,
  browserController.getFile
 );
router.post("/renameFile", isAuth, isFileOwner, browserController.renameFile);
router.post("/moveFile", isAuth, isFileOwner, browserController.moveFile);
router.post("/deleteFile", isAuth, isFileOwner, browserController.deleteFile);

export default router;
