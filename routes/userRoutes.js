import express from "express";

import { isAuth } from "../lib/authMiddleware.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.get("/login", userController.getLogin);
router.post("/login", userController.postLogin);
router.get("/register", userController.getRegister);
router.post("/register", userController.postRegister);
router.get("/logout", userController.getLogout);
router.get("/profile", userController.getProfile);
router.post("/profile", userController.postProfile);

// Test auth
router.get("/protected", isAuth, userController.getProtected);

export default router;
