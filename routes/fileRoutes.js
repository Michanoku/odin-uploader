import express from "express";
const router = express.Router();
import { isAuth, isOwner, isShared } from "../lib/authMiddleware.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

import * as fileController from "../controllers/fileController.js";

router.post("/upload", isAuth, upload.single("file"), fileController.uploadFile);
router.get("/browser", isAuth, fileController.getFolder);
router.get("/browser/folder/:folderId", isAuth, isOwner, fileController.getFolder);
router.get("/shared/:sharedFolderId", isAuth, isShared, fileController.getShared);
router.get("/shared/:sharedFolderId/folder/:folderId", isAuth, isShared, fileController.getShared);
router.post("/createFolder", isAuth, fileController.createFolder);
router.post("/renameFolder", isAuth, isOwner, fileController.createFolder);
router.post("/moveFolder", isAuth, isOwner, fileController.createFolder);
router.post("/deleteFolder", isAuth, isOwner, fileController.createFolder);

export default router;
