import fs from "fs/promises";
import path from "path";
import { body, check, validationResult, matchedData } from "express-validator";

import * as db from "../db/browserQueries.js";
import {
  getFolderContents,
  getBreadcrumbs,
  formatFileSize,
  formatDate,
} from "../lib/browserUtils.js";
import { register } from "module";

// Validators used in this controller
const validateFolder = [
  body("newFolderName")
    .trim()
    .notEmpty()
    .withMessage("Folder name is required")

    .isLength({ max: 255 })
    .withMessage("Folder name must be 255 characters or fewer")
    .custom((value) => {
      if (value === "." || value === "..") {
        throw new Error("Invalid folder name");
      }

      if (/[<>:"/\\|?*]/.test(value)) {
        throw new Error("Folder name contains invalid characters");
      }

      if (/[\x00-\x1F\x7F]/.test(value)) {
        throw new Error("Folder name contains invalid characters");
      }

      return true;
    }),
  check("currentFolder").custom(async (_, { req }) => {
    const exists = await db.folderExists({
      name: req.body.newFolderName,
      userId: req.user.id,
      parentId: req.currentFolder?.id ?? null,
    });

    if (exists) {
      throw new Error(
        "Folder of the same name already exists in the same location."
      );
    }

    return true;
  }),
];

const validateRenameFolder = [
  body("updatedFolderName")
    .trim()
    .notEmpty()
    .withMessage("Folder name is required")

    .isLength({ max: 255 })
    .withMessage("Folder name must be 255 characters or fewer")
    .custom((value) => {
      if (value === "." || value === "..") {
        throw new Error("Invalid folder name");
      }

      if (/[<>:"/\\|?*]/.test(value)) {
        throw new Error("Folder name contains invalid characters");
      }

      if (/[\x00-\x1F\x7F]/.test(value)) {
        throw new Error("Folder name contains invalid characters");
      }

      return true;
    })
    // Check if a folder of the same name exists at the location
    .custom(async (value, { req }) => {
      const folder = req.targetFolder;
      const exists = await db.folderExists({
        name: value,
        userId: req.user.id,
        parentId: folder.parentId,
      });

      if (exists) {
        throw new Error(
          "Folder of the same name already exists in the same location."
        );
      }
      return true;
    }),
];

const validateMoveFolder = [
  check("updatedParentId")
    // Check if a folder of the same name exists at the location
    .custom(async (value, { req }) => {
      const folder = req.targetFolder;
      const exists = await db.folderExists({
        name: folder.name,
        userId: req.user.id,
        parentId: req.body.updatedParentId,
      });

      if (exists) {
        throw new Error(
          "Folder of the same name already exists in the same location."
        );
      }
      return true;
    }),
];

const validateFile = [
  // If no file was provided, return error
  check("file")
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error("Please select a file.");
      }
      return true;
    })
    // Check if a file of that name exists in the same folder
    .custom(async (value, { req }) => {
      const exists = await db.fileExists({
        originalname: req.file.originalname,
        userId: req.user.id,
        folderId: req.body.currentFolder.id,
      });

      if (exists) {
        throw new Error("File of the same name already exists in the folder.");
      }
      return true;
    }),
  // If a folder was provided make sure the user is the owner
  body("currentFolder")
    .if((value) => value !== "")
    .bail()
    .custom(async (value, { req }) => {
      const isOwner = await db.getFolder({
        folderId: value,
        userId: req.user.id,
      });
      if (!isOwner) {
        throw new Error("Folder not found");
      }

      return true;
    }),
];

// Folders
const redirectToRoot = (req, res) => {
  res.redirect(`/browser/folder/${req.user.rootFolderId}`);
};

const createFolder = [
  // Create a new folder in the users tree
  validateFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { newFolderName } = matchedData(req);
    try {
      // Create the new folder with the provided data
      const folderData = {
        name: newFolderName,
        parentId: req.currentFolder.id,
        userId: req.user.id,
      };
      const newFolder = await db.createFolder(folderData);
      res.json({ success: true, folder: newFolder });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Get a folder and its contents to display to the user
const getFolder = async (req, res, next) => {
  // Contents will have folder contents, breadcrumbs will serve as the tree to go back
  let contents = { folders: [], files: [] };
  let breadcrumbs = [];
  try {
    if (req.currentFolder) {
      // If the user is not in the root, a folder is provided
      const folderId = req.currentFolder.id ?? null;
      const [contentsResult, breadcrumbsResult] = await Promise.all([
        getFolderContents({ folderId: folderId }),
        getBreadcrumbs({ folderId: folderId }),
      ]);
      contents = contentsResult;
      breadcrumbs = breadcrumbsResult;
    } else {
      contents = await getFolderContents({ userId: req.user.id });
    }

    const context = {
      title: "Browser",
      view: "folder",
      parentId: req.currentFolder?.parentId ?? null,
      contents,
      breadcrumbs,
    };

    res.render("files/browser", context);
  } catch (err) {
    return next(err);
  }
};

const renameFolder = [
  // Rename Folder
  validateRenameFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { updatedFolderName } = matchedData(req);
    const folderId = req.targetFolder.id;
    try {
      const updatedfolderData = {
        name: updatedFolderName,
      };
      const updatedFolder = await db.updateFolder(folderId, updatedfolderData);
      res.json({ success: true, folder: updatedFolder });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

const moveFolder = [
  // Create a new folder in the users tree
  validateMoveFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const folderId = req.targetFolder.id;
    try {
      const updatedfolderData = {
        parentId: req.body.updatedParentId,
      };
      const updatedFolder = await db.updateFolder(folderId, updatedfolderData);
      res.json({ success: true, folder: updatedFolder });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

const deleteFolder = async (req, res) => {
  const folderId = req.targetFolder.id;
  try {
    // Get the filenames of all files we are about to delete
    const filesToDelete = await db.getAllFilesFromSubfolders(folderId);
    // Delete the database entries for the folder (cascades to subfolders and files)
    const deletedFolder = await db.deleteFolder(folderId);

    // Delete the files from disk
    await Promise.all(
      filesToDelete.map(async (file) => {
        try {
          await fs.unlink(path.resolve("uploads", file.filename));
        } catch (err) {
          if (err.code !== "ENOENT") {
            throw err;
          }
        }
      })
    );

    res.json({ success: true, folder: deletedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

// TODO: download folder

// Files
const uploadFile = [
  // Create a new folder in the users tree
  validateFile,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    try {
      const fileData = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        filename: req.file.filename,
        size: req.file.size,
        folderId: req.body.currentFolder.id === "" ? null : req.body.currentFolder.id,
        userId: req.user.id,
      };
      const newFile = await db.createFile(fileData);
      const response = { success: true, file: newFile };
      res.json(response);
    } catch (err) {
      return next(err);
    }
  },
];

const getFile = async (req, res, next) => {
  const file = req.file;
  const folder = req.folder ?? null;
  const folderId = folder?.id ?? null;
  let breadcrumbs = [];
  try {
    if (folder) {
      breadcrumbs = await getBreadcrumbs({ folderId: folderId });
    }
    const context = {
      title: "Browser",
      view: "file",
      parentId: folder?.parentId ?? null,
      fileSize: formatFileSize(file.size),
      date: formatDate(file.createdAt),
      file,
      breadcrumbs,
      folderId,
    };

    res.render("files/browser", context);
  } catch (err) {
    return next(err);
  }
};

const renameFile = async (req, res) => {
  const fileId = req.body.fileId;
  try {
    const updatedfileData = {
      originalname: req.body.updatedFileName,
    };
    const updatedFile = await db.updateFile(fileId, updatedfileData);
    res.json({ success: true, file: updatedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const moveFile = async (req, res) => {
  const fileId = req.body.fileId;
  try {
    const updatedfileData = {
      folderId: req.body.updatedFolderId,
    };
    const updatedFile = await db.updateFile(fileId, updatedfileData);
    res.json({ success: true, file: updatedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const deleteFile = async (req, res) => {
  const fileId = req.body.fileId;
  try {
    // Delete file in database
    const deletedFile = await db.deleteFile(fileId);
    // Get file path for the actual file on disk
    const filePath = path.resolve("uploads", deletedFile.filename);
    // Delete the file
    await fs.unlink(filePath);

    res.json({ success: true, file: deletedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

export {
  redirectToRoot,
  createFolder,
  getFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  uploadFile,
  getFile,
  renameFile,
  moveFile,
  deleteFile,
};
