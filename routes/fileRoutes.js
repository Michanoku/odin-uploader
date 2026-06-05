import express from "express";
const router = express.Router();
import {
  isAuth,
  isFolderOwner,
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

export default router;
