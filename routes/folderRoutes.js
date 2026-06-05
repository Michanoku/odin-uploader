import express from "express";
const router = express.Router();
import {
  isAuth,
  isFolderOwner,
  isSharedFolder,
  isSharedDescendant,
} from "../lib/authMiddleware.js";

import * as folderController from "../controllers/folderController.js";


router.get("/browser", isAuth, folderController.getFolder);
router.get(
  "/browser/folder/:folderId",
  isAuth,
  isFolderOwner,
  folderController.getFolder
);
router.get(
  "/shared/:sharedFolderId",
  isAuth,
  isSharedFolder,
  folderController.getShared
);
router.get(
  "/shared/:sharedFolderId/folder/:folderId",
  isAuth,
  isSharedFolder,
  isSharedDescendant,
  folderController.getShared
);
router.post("/createFolder", isAuth, folderController.createFolder);
router.post("/renameFolder", isAuth, isFolderOwner, folderController.renameFolder);
router.post("/moveFolder", isAuth, isFolderOwner, folderController.moveFolder);
router.post("/deleteFolder", isAuth, isFolderOwner, folderController.deleteFolder);
router.post("/shareFolder", isAuth, isFolderOwner, folderController.shareFolder);

export default router;
