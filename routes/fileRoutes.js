import express from "express";
const router = express.Router();
import {
  isAuth,
  isOwner,
  isSharedFolder,
  isSharedDescendant,
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
router.get("/browser", isAuth, fileController.getFolder);
router.get(
  "/browser/folder/:folderId",
  isAuth,
  isOwner,
  fileController.getFolder
);
router.get(
  "/shared/:sharedFolderId",
  isAuth,
  isSharedFolder,
  fileController.getShared
);
router.get(
  "/shared/:sharedFolderId/folder/:folderId",
  isAuth,
  isSharedFolder,
  isSharedDescendant,
  fileController.getShared
);
router.post("/createFolder", isAuth, fileController.createFolder);
router.post("/renameFolder", isAuth, isOwner, fileController.renameFolder);
router.post("/moveFolder", isAuth, isOwner, fileController.moveFolder);
router.post("/deleteFolder", isAuth, isOwner, fileController.deleteFolder);
router.post("/shareFolder", isAuth, isOwner, fileController.shareFolder);

export default router;
