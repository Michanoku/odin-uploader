import path from "path";

import { body, validationResult, matchedData } from "express-validator";
import { ZipArchive } from "archiver";

import * as sharedQueries from "../db/sharedQueries.js";
import { getFolder } from "../db/browserQueries.js";
import {
  getFolderContents,
  renderFolderContents,
  getBreadcrumbs,
  collectFilesWithPaths,
  formatDate,
  formatFileSize,
} from "../lib/browserUtils.js";
import { register } from "module";

const uploadFolder =
  process.env.NODE_ENV === "test" ? "uploads/test" : "uploads";

// Validators
const folderShareValidation = [
  body("duration")
    .toInt()
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be an integer between 1 and 30")
    .bail()
    .custom(async (_, { req }) => {
      if (req.targetFolder.shareId) {
        throw new Error("Folder already part of a shared group.");
      }
      return true;
    }),
];

const fileShareValidation = [
  body("duration")
    .toInt()
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be an integer between 1 and 30")
    .bail()
    .custom(async (_, { req }) => {
      if (req.targetFile.shareId) {
        throw new Error("File already part of a shared group.");
      }
      return true;
    }),
];

// Folder related functions
// Share a folder
const shareFolder = [
  folderShareValidation,
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
      await sharedQueries.shareFolder(folderId, duration);
      const sharedFolder = await getFolder({folderId, userId: req.user.id});
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const sharedUrl = `Your shared folder link: ${baseUrl}/shared/folder/${sharedFolder.id}`;
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      return res.json({
        success: true,
        folder: sharedFolder,
        shared: true,
        url: sharedUrl,
        folderContents: folderContents,
      });
    } catch (err) {
      console.log(err);
      return res.json({ success: false, error: err });
    }
  },
];

// Unshare a folder
const unshareFolder = async (req, res, next) => {
  if (req.targetFolder.shareId && !req.targetFolder.rootShare) {
    return res.json({
      success: false,
      error: "Folder is not the root of this shared group.",
    });
  }
  const folderId = req.targetFolder.id;
  // Delete the share reference. That is all.
  try {
    await sharedQueries.unshareFolder(folderId);
    const unsharedFolder = await getFolder({folderId, userId: req.user.id});
    const folderContentsRaw = await getFolderContents(req.currentFolder.id);
    const folderContents = await renderFolderContents(
      folderContentsRaw,
      req.currentFolder,
      formatDate
    );
    return res.json({
      success: true,
      folder: unsharedFolder,
      folderContents: folderContents,
    });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, error: err });
  }
};

// Get a shared folder to display to the user, the middleware already checks safety measures
const getSharedFolder = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const sharedRootId = req.sharedRootId;
  const parentId = sharedFolder.rootShare ? null :  sharedFolder.parentId;

  // Get the breadcrumbs of any and the contents of the folder
  const [contents, breadcrumbs] = await Promise.all([
    getFolderContents(sharedFolder.id),
    getBreadcrumbs({ folderId: sharedFolder.id, rootId: sharedRootId }),
  ]);

  const context = {
    title: "Shared folder",
    view: "folder",
    contents,
    breadcrumbs,
    folderId: sharedFolder.id,
    sharedFolder,
    parentId: parentId,
    sharedRootId: sharedRootId,
    formatDate,
  };

  return res.render("files/shared", context);
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
    sharedRootId: null,
    file,
  };
  // If the file is part of a sharedfolder, also get breadcrumbs and so on
  try {
    if (req.sharedFolder) {
      const sharedRootId = req.sharedRootId;
      console.log(sharedRootId)
      const parentId = file.rootShare ? null : file.folderId;
      const [contents, breadcrumbs] = await Promise.all([
        getFolderContents(req.sharedFolder.id),
        getBreadcrumbs({ folderId: req.sharedFolder.id, rootId: sharedRootId }),
      ]);
      context.parentId = parentId;
      context.breadcrumbs = breadcrumbs;
      context.folderId = req.sharedFolder.id;
      context.sharedRootId = sharedRootId;
    }
    return res.render("files/shared", context);
  } catch (err) {
    return next(err);
  }
};

// Share a file after validating the duration. File ownership is validated in middleware
const shareFile = [
  fileShareValidation,
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
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const sharedUrl = `Your shared file link: ${baseUrl}/shared/file/${sharedFile.id}`;
      const folderContentsRaw = await getFolderContents(req.currentFolder.id);
      const folderContents = await renderFolderContents(
        folderContentsRaw,
        req.currentFolder,
        formatDate
      );
      return res.json({
        success: true,
        file: sharedFile,
        shared: true,
        folderContents: folderContents,
        url: sharedUrl,
      });
    } catch (err) {
      console.log(err);
      return res.json({ success: false, error: err });
    }
  },
];

// Unshare a file
const unshareFile = async (req, res, next) => {
  if (req.targetFile.shareId && !req.targetFile.rootShare) {
    return res.json({
      success: false,
      error: "File is not the root of this shared group.",
    });
  }
  const fileId = req.targetFile.id;
  // Delete the share object. That is all.
  try {
    const unsharedFile = await sharedQueries.unshareFile(fileId);
    const folderContentsRaw = await getFolderContents(req.currentFolder.id);
    const folderContents = await renderFolderContents(
      folderContentsRaw,
      req.currentFolder,
      formatDate
    );
    return res.json({ success: true, file: unsharedFile, folderContents: folderContents });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, error: err });
  }
};

// Download a shared file
const downloadSharedFile = async (req, res, next) => {
  // Name the file its original filename and send it to the user
  const filePath = path.resolve(uploadFolder, req.sharedTargetFile.filename);

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
