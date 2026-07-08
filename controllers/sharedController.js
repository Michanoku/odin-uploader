import path from "path";

import { body, validationResult, matchedData } from "express-validator";
import { ZipArchive } from "archiver";

import * as sharedQueries from "../db/sharedQueries.js";
import { getFolder } from "../db/browserQueries.js";
import {
  getFolderContents,
  getBreadcrumbs,
  collectFilesWithPaths,
  formatDate,
  formatFileSize,
} from "../lib/browserUtils.js";

// Only duration needs to be validated here. All other validations happen in authMiddleware.js
const durationValidation = [
  body("duration")
    .toInt()
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be an integer between 1 and 30"),
];

// Folder related functions
// Share a folder
const shareFolder = [
  durationValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { duration } = matchedData(req);
    const folderId = req.targetFolder.id;

    // Share the folder by creating a share model referecing it (and all subfolders and files)
    try {
      const sharedFolder = await sharedQueries.shareFolder(folderId, duration);
      res.json({ success: true, folder: sharedFolder });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Unshare a folder
const unshareFolder = async (req, res, next) => {
  const folderId = req.targetFolder.id;
  // Delete the share reference. That is all.
  try {
    const unsharedFolder = await sharedQueries.unshareFolder(folderId);
    res.json({ success: true, folder: unsharedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

// Get a shared folder to display to the user, the middleware already checks safety measures
const getSharedFolder = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const sharedRootId = req.sharedRootId;
  const parentId =
    sharedFolder.parentId === sharedRootId ? null : sharedFolder.parentId;

  // Get the breadcrumbs of any and the contents of the folder
  const [contents, breadcrumbs] = await Promise.all([
    getFolderContents({ folderId: sharedFolder.id }),
    getBreadcrumbs({ folderId: sharedFolder.id, rootId: sharedRootId }),
  ]);

  const context = {
    title: "Shared folder",
    contents,
    breadcrumbs,
    folderId: sharedFolder.id,
    sharedFolder,
    parentId: parentId,
  };

  res.render("files/shared", context);
};

// Download the shared folder with all of its contents
const downloadSharedFolder = async (req, res, next) => {
  try {
    // Collect files and paths for these files
    const results = await collectFilesWithPaths(
      req.sharedTargetFolder.id,
      req.sharedTargetFolder.name
    );

    // Create a new archive
    const archive = new ZipArchive("zip", {
      zlib: { level: 6 },
    });

    // Add some error handlers
    archive.on("warning", (err) => {
      console.warn(err);
    });

    archive.on("error", (err) => {
      next(err);
    });

    // Add the file with the name of the folder and pipe it to the user
    res.attachment(`${req.sharedTargetFolder.name}.zip`);
    archive.pipe(res);

    // Get all files and their paths and name them their original filenames
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

//File related functions
// Get a file that has been shared, the file has been loaded by the middleware
const getSharedFile = async (req, res, next) => {
  const file = req.sharedFile;
  const context = {
    title: "Shared File",
    view: "file",
    fileSize: formatFileSize(file.size),
    date: formatDate(file.createdAt),
    breadcrumbs: [],
    parentId: null,
    folderId: null,
    file,
  };
  // If the file is part of a sharedfolder, also get breadcrumbs and so on
  try {
    if (req.sharedFolder) {
      const sharedRootId = req.sharedRootId;
      const parentId =
        file.folderId === sharedRootId ? null : req.sharedFolder.parentId;
      const [contents, breadcrumbs] = await Promise.all([
        getFolderContents({ folderId: req.sharedFolder.id }),
        getBreadcrumbs({ folderId: req.sharedFolder.id, rootId: sharedRootId }),
      ]);
      context.parentId = parentId;
      context.breadcrumbs = breadcrumbs;
      context.folderId = folderId;
    }
    res.render("files/browser", context);
  } catch (err) {
    return next(err);
  }
};

// Share a file after validating the duration. File ownership is validated in middleware
const shareFile = [
  durationValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { duration } = matchedData(req);
    const fileId = req.targetFile.id;
    // Create the share object to connect to the file
    try {
      const sharedFile = await sharedQueries.shareFile(fileId, duration);
      res.json({ success: true, file: sharedFile });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

// Unshare a file
const unshareFile = async (req, res, next) => {
  const fileId = req.targetFile.id;
  // Delete the share object. That is all.
  try {
    const unsharedFile = await sharedQueries.unshareFile(fileId);
    res.json({ success: true, file: unsharedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

// Download a shared file
const downloadSharedFile = async (req, res, next) => {
  // Name the file its original filename and send it to the user
  const filePath = path.resolve("uploads", req.sharedTargetFile.filename);

  res.download(filePath, req.sharedTargetFile.originalname, (err) => {
    if (err) {
      next(err);
    }
  });
};

export {
  shareFolder,
  unshareFolder,
  getSharedFolder,
  downloadSharedFolder,
  getSharedFile,
  shareFile,
  unshareFile,
  downloadSharedFile,
};
