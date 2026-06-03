import express from "express";
const router = express.Router();
import { isAuth } from "../lib/authMiddleware.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

import * as fileController from "../controllers/fileController.js";

router.get("/upload", isAuth, fileController.postUpload);
router.post("/upload", isAuth, upload.single("file"), fileController.getUpload);

export default router;
