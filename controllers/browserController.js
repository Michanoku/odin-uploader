import fs from "fs/promises";
import path from "path";
import { register } from "module";

import { ZipArchive } from "archiver";
import { body, check, validationResult, matchedData } from "express-validator";

import * as db from "../db/browserQueries.js";
import {
  getFolderContents,
  renderFolderContents,
  getBreadcrumbs,
  formatFileSize,
  formatDate,
  collectFilesWithPaths,
  limitExceeded,
  shareManager,
} from "../lib/browserUtils.js";

const uploadFolder =
  process.env.NODE_ENV === "test" ? "uploads/test" : "uploads";

// Validators
// Validate New Folders
const validateNewFolder = [
  body("folderName")
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
    .bail()
    .custom(async (value, { req }) => {
      const exists = await db.folderExists({
        name: value,
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

// Validate Folder on Renaming
const validateRenameFolder = [
  body("folderName")
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
    .bail()
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

// Validate Folder on Moving
const validateMoveFolder = [
  body("parentId")
    // Check if a folder of the same name exists at the location
    .custom(async (value, { req }) => {
      const folder = req.targetFolder;
      const exists = await db.folderExists({
        name: folder.name,
        userId: req.user.id,
        parentId: req.body.parentId,
      });

      if (exists) {
        throw new Error(
          "Folder of the same name already exists in the same location."
        );
      }
      return true;
    })
    .bail()
    .custom(async (value, { req }) => {
      const folder = req.targetFolder;
      if (value === folder.id) {
        throw new Error("Can't move folder into itself");
      }
      return true;
    })
    .bail()
    .custom(async (value, { req }) => {
      const folder = req.targetFolder;
      const descendant = await db.isDescendant(folder.id, value);
      if (descendant) {
        throw new Error("Can't move folder into subfolder.");
      }
      return true;
    }),
];

// Validate New Files
// There could be more checks here, like file size, but for this project, this shall do
const validateNewFile = [
  // If no file was provided, return error
  check("file")
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error("Please select a file.");
      }
      return true;
    })
    .bail()
    // Check if a file of that name exists in the same folder
    .custom(async (value, { req }) => {
      const exists = await db.fileExists({
        originalname: req.file.originalname,
        userId: req.user.id,
        folderId: req.currentFolder.id,
      });

      if (exists) {
        throw new Error("File of the same name already exists in the folder.");
      }
      return true;
    })
    .bail()
    // Check that the user has not reached their limit
    .custom(async (value, { req }) => {
      const exceeded = await limitExceeded(req.user.id, req.file.size);
      if (exceeded) {
        throw new Error("Maximum storage space exceeded.");
      }
    }),
];

// Validate file on renaming
const validateRenameFile = [
  // If no file was provided, return error
  body("fileName")
    .trim()
    .notEmpty()
    .withMessage("File name is required")
    // Check if a file of that name exists in the same folder
    .custom(async (value, { req }) => {
      const exists = await db.fileExists({
        originalname: value,
        userId: req.user.id,
        folderId: req.currentFolder.id,
      });

      if (exists) {
        throw new Error("File of the same name already exists in the folder.");
      }
      return true;
    }),
];

// Validate file on moving
const validateMoveFile = [
  body("folderId")
    .trim()
    .notEmpty()
    .withMessage("Target folder is required.")
    // Check if a folder of the same name exists at the location
    .custom(async (value, { req }) => {
      const file = req.targetFile;
      const exists = await db.fileExists({
        originalname: file.originalname,
        userId: req.user.id,
        folderId: value,
      });

      if (exists) {
        throw new Error("File of the same name already exists in the folder.");
      }
      return true;
    }),
];

// Folder related functions
// When the user accesses index, they are redirected to their own root folder
const redirectUser = (req, res) => {
  if (req.user) {
    res.redirect(`/browser/folder/${req.user.rootFolderId}`);
  } else {
    res.render("users/register", { title: "Register" });
  }
};

// The user can create a folder, it will be validated and if passed, created
const createFolder = [
  validateNewFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { folderName } = matchedData(req);
    try {
      // Create the new folder with the provided data
      const folderData = {
        name: folderName,
        parentId: req.currentFolder.id,
        userId: req.user.id,
        shareId: req.currentFolder.shareId || null,
      };
      const newFolder = await db.createFolder(folderData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        folder: newFolder,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Get a folder and its contents to display to the user
const getFolder = async (req, res, next) => {
  // Contents will have folder contents, breadcrumbs will serve as the tree to go back
  try {
    const folderId = req.currentFolder.id;
    const [contents, breadcrumbs] = await Promise.all([
      getFolderContents(folderId),
      getBreadcrumbs({ folderId }),
    ]);
    const context = {
      title: "Browser",
      view: "folder",
      parentId: req.currentFolder.parentId ?? null,
      contents,
      breadcrumbs,
      formatDate,
    };

    res.render("files/browser", context);
  } catch (err) {
    return next(err);
  }
};

// Get a folder and its contents to display to the user
const getTree = async (req, res, next) => {
  // Contents will have folder contents, breadcrumbs will serve as the tree to go back
  try {
    const id =
      req.body.folderId === "root" ? req.user.rootFolderId : req.body.folderId;
    const targetId = req.body.targetFolderId;
    const folder = db.getFolder({ folderId: id, userId: req.user.id });
    if (!folder) return res.json({ success: false, error: "Not found." });

    const tree = await db.getAllSubfolders(id);
    const filteredTree = tree.filter((folder) => folder.id !== targetId);

    res.json({ success: true, tree: filteredTree });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

// Rename a folder, but check if the name collides with existing folders
const renameFolder = [
  validateRenameFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { folderName } = matchedData(req);
    // The folder to be renamed
    const folderId = req.targetFolder.id;
    try {
      const updatedfolderData = {
        name: folderName,
      };
      const updatedFolder = await db.updateFolder(folderId, updatedfolderData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        folder: updatedFolder,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Move a folder, but check if the folder name collides with existing folders
const moveFolder = [
  validateMoveFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    // The folder to be moved
    const { parentId } = matchedData(req);

    const folderId = req.targetFolder.id;
    try {
      const parentFolder = await db.getFolder({
        folderId: parentId,
        userId: req.user.id,
      });
      await shareManager(req.targetFolder, parentFolder, "folder");
      const updatedfolderData = {
        parentId: parentId,
      };
      const updatedFolder = await db.updateFolder(folderId, updatedfolderData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        folder: updatedFolder,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Delete a folder and all of its contents (other folders as well as files)
// Some services don't allow this, but I decided I don't care and the user can yeet their folders if they want
const deleteFolder = async (req, res) => {
  const folderId = req.targetFolder.id;
  try {
    // Get the filenames of all files we are about to delete
    const folderIds = await db.collectFolderIds(folderId);
    const filesToDelete = await db.getAllFilesFromSubfolders(folderIds);
    // Delete the database entries for the folder (cascades to subfolders and files)
    const deletedFolder = await db.deleteFolder(folderId);

    // Delete the files from disk
    await Promise.all(
      filesToDelete.map(async (file) => {
        try {
          // Apparantly unlink means delete in this. Learned something new.
          await fs.unlink(path.resolve(uploadFolder, file.filename));
        } catch (err) {
          // If there is any other error other than file no longer exists, throw the error.
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

// Download an entire folder including subfolders and files
const downloadFolder = async (req, res, next) => {
  // Get a list of all files and all paths
  try {
    const results = await collectFilesWithPaths(
      req.targetFolder.id,
      req.targetFolder.name
    );

    // Create a new zip archive with a medium compression
    const archive = new ZipArchive("zip", {
      zlib: { level: 6 },
    });

    // Add some safeguards for errors
    archive.on("warning", (err) => {
      console.warn(err);
    });

    archive.on("error", (err) => {
      next(err);
    });

    // Attach the zip file and pipe it to the user
    res.attachment(`${req.targetFolder.name}.zip`);
    archive.pipe(res);

    // Combine paths and original file names to create the zip file
    for (const file of results) {
      archive.file(file.diskPath, {
        name: file.zipPath,
      });
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
};

// File related functions
// Upload a file, but check if file was provided or if same filename exists
const uploadFile = [
  validateNewFile,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        const filePath = path.resolve(uploadFolder, req.file.filename);
        await fs.unlink(filePath);
      }
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Create the file in the database
    try {
      const fileData = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        filename: req.file.filename,
        size: req.file.size,
        folderId: req.currentFolder.id,
        userId: req.user.id,
        shareId: req.currentFolder.shareId || null,
      };
      const newFile = await db.createFile(fileData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        file: newFile,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      return next(err);
    }
  },
];

// Allows the user to download single files
const downloadFile = (req, res, next) => {
  // Get the file and send it to the download with the original filename
  const filePath = path.resolve(uploadFolder, req.targetFile.filename);

  res.download(filePath, req.targetFile.originalname, (err) => {
    if (err) {
      next(err);
    }
  });
};

// Open file details for the user to view
const getFile = async (req, res, next) => {
  const file = req.targetFile;
  // TODO currently the app is not made to serve targetfolder here. I do want breadcrumbs maybe so I
  // will have to check how to best implement this. could be that simply using the same method as in
  // getFolder is enough.
  const folder = req.targetFolder ?? null;
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

// Rename a file but check if it collide with existing files
const renameFile = [
  validateRenameFile,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { fileName } = matchedData(req);
    try {
      // Get the file and rename it.
      const fileId = req.targetFile.id;
      const updatedfileData = {
        originalname: fileName,
      };
      const updatedFile = await db.updateFile(fileId, updatedfileData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        file: updatedFile,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Move a file but check if it collides with existing files first
const moveFile = [
  validateMoveFile,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    // Move the file
    const { folderId } = matchedData(req);
    const fileId = req.targetFile.id;

    try {
      const parentFolder = await db.getFolder({ folderId, userId: req.user.id });
      await shareManager(req.targetFile, parentFolder, "file");
      const updatedfileData = {
        folderId,
      };
      const updatedFile = await db.updateFile(fileId, updatedfileData);
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      const response = {
        success: true,
        file: updatedFile,
        folderContents: folderContents,
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Delete a file from the users database and the disk
const deleteFile = async (req, res) => {
  const fileId = req.targetFile.id;
  try {
    // Delete file in database
    const deletedFile = await db.deleteFile(fileId);
    // Get file path for the actual file on disk
    const filePath = path.resolve(uploadFolder, deletedFile.filename);
    // Delete the file
    await fs.unlink(filePath);

    const folderContentsRaw = await getFolderContents(req.currentFolder.id);
    const folderContents = await renderFolderContents(
      folderContentsRaw,
      req.currentFolder,
      formatDate
    );
    const response = {
      success: true,
      file: deletedFile,
      folderContents: folderContents,
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

export {
  redirectUser,
  createFolder,
  downloadFolder,
  getFolder,
  getTree,
  renameFolder,
  moveFolder,
  deleteFolder,
  uploadFile,
  downloadFile,
  getFile,
  renameFile,
  moveFile,
  deleteFile,
};
