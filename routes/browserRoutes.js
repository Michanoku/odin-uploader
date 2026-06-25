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
  isFolderOwner,
  isFileOwner,
} from "../lib/authMiddleware.js";
import * as browserController from "../controllers/browserController.js";



// Folders
router.get("/browser", isAuth, browserController.getFolder);
router.get(
  "/browser/folder/:folderId",
  isAuth,
  isFolderOwner,
  browserController.getFolder
);
router.post("/createFolder", isAuth, browserController.createFolder);
router.post("/renameFolder", isAuth, isFolderOwner, browserController.renameFolder);
router.post("/moveFolder", isAuth, isFolderOwner, browserController.moveFolder);
router.post("/deleteFolder", isAuth, isFolderOwner, browserController.deleteFolder);

// Files
router.post(
  "/upload",
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
