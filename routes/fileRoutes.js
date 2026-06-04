import express from "express";
const router = express.Router();
import { isAuth } from "../lib/authMiddleware.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

import * as fileController from "../controllers/fileController.js";

router.post("/upload", isAuth, upload.single("file"), fileController.uploadFile);
router.get("/browser", isAuth, fileController.getBrowser);
router.get("/browser/folder/:folderId", isAuth, fileController.getBrowser);
router.post("/createFolder", isAuth, fileController.createFolder);

export default router;
