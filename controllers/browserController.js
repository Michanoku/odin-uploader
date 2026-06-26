import { ResultWithContextImpl } from "express-validator/lib/chain/index.js";
import { body, validationResult, matchedData } from "express-validator";

import * as db from "../db/browserQueries.js";
import {
  getFolderContents,
  getBreadcrumbs,
  formatFileSize,
  formatDate,
} from "../lib/browserUtils.js";

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
  body("currentFolder")
    // Check if a folder of the same name exists at the location
    .custom(async (value, { req }) => {
      const exists = await db.folderExists({
        folderName: req.body.newFolderName,
        userId: req.user.id,
        parentId: value,
      });

      if (exists) {
        throw new Error(
          "Folder of the same name already exists in the same location."
        );
      }
      return true;
    })
    // If no parent folder is provided, skip the next check
    .if((value) => value !== "")
    .bail()
    // Check if the user owns the provided folder
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
        folderId: value,
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
        parentId: req.body.currentFolder === "" ? null : req.body.currentFolder,
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
  // If the user is not in the root, a folder is provided
  const folder = req.folder ?? null;
  const folderId = folder?.id ?? null;
  // Contents will have folder contents, breadcrumbs will serve as the tree to go back
  let contents = { folders: [], files: [] };
  let breadcrumbs = [];
  try {
    if (folder) {
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
      parentId: folder?.parentId ?? null,
      contents,
      breadcrumbs,
      folderId,
    };

    res.render("files/browser", context);
  } catch (err) {
    return next(err);
  }
};

const renameFolder = async (req, res) => {
  const folderId = req.body.folderId;
  try {
    const updatedfolderData = {
      name: req.body.updatedFolderName,
    };
    const updatedFolder = await db.updateFolder(folderId, updatedfolderData);
    res.json({ success: true, folder: updatedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const moveFolder = async (req, res) => {
  const folderId = req.body.folderId;
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
};

const deleteFolder = async (req, res) => {
  const folderId = req.body.folderId;
  try {
    const deletedFolder = await db.deleteFolder(folderId);
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
        folderId: req.body.currentFolder === "" ? null : req.body.currentFolder,
        userId: req.user.id,
      };
      const newFile = await db.createFile(fileData);
      const response = { success: true, file: newFile };
      console.log(response);
      res.json(response);
    } catch (err) {
      return next(err);
    }
  },
];
const uploadFile = async (req, res, next) => {
  // If no file is present, show error
  try {
    const fileData = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      filename: req.file.filename,
      size: req.file.size,
      folderId: req.body.currentFolder === "" ? null : req.body.currentFolder,
      userId: req.user.id,
    };
    const newFile = await db.createFile(fileData);
    const response = { success: true, file: newFile };
    console.log(response);
    res.json(response);
  } catch (err) {
    return next(err);
  }
};

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
      name: req.body.updatedFileName,
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
      parentId: req.body.updatedParentId,
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
    const deletedFile = await db.deleteFile(fileId);
    res.json({ success: true, file: deletedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};


export {
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
