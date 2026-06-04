import express from "express";
const router = express.Router();
import { isAuth } from "../lib/authMiddleware.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

import * as fileController from "../controllers/fileController.js";

router.get("/upload", isAuth, fileController.getUpload);
router.post("/upload", isAuth, upload.single("file"), fileController.postUpload);

export default router;
