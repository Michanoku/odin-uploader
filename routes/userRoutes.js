import express from 'express';
const router = express.Router();
import { isAuth } from "../lib/authMiddleware.js";
import * as userController from "../controllers/userController.js";

router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);
router.get('/register', userController.getRegister);
router.post('/register', userController.postRegister);
router.get('/logout', userController.getLogout);

// Test your auth, remove if no longer needed
router.get('/protected', isAuth, userController.getProtected);

export default router;