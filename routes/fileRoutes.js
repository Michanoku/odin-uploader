import express from "express";
const router = express.Router();
import {
  isAuth,
  isFolderOwner,
  isFileOwner,
  isSharedFolder,
} from "../lib/authMiddleware.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

import * as fileController from "../controllers/fileController.js";

router.post(
  "/upload",
  isAuth,
  upload.single("file"),
  fileController.uploadFile
);
router.post("/renameFile", isAuth, isFileOwner, folderController.renameFolder);
router.post("/moveFile", isAuth, isFileOwner, folderController.moveFolder);
router.post("/deleteFile", isAuth, isFileOwner, folderController.deleteFolder);
router.post("/shareFile", isAuth, isFileOwner, folderController.shareFolder);

export default router;
