import * as sharedQueries from "../db/sharedQueries.js";
import { getFolder } from "../db/browserQueries.js";
import {
  getFolderContents,
  getBreadcrumbs,
  collectFilesWithPaths,
  formatDate,
  formatFileSize,
} from "../lib/browserUtils.js";
import { body, validationResult, matchedData } from "express-validator";
import path from "path";
import { ZipArchive } from "archiver";

const durationValidation = [
  body("duration")
    .toInt()
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be an integer between 1 and 30"),
];

// Folders
const shareFolder = [
  // Share a Folder
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
    try {
      const sharedFolder = await sharedQueries.shareFolder(folderId, duration);
      res.json({ success: true, folder: sharedFolder });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

const unshareFolder = async (req, res, next) => {
  const folderId = req.targetFolder.id;
  try {
    const unsharedFolder = await sharedQueries.unshareFolder(folderId);
    res.json({ success: true, folder: unsharedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const getSharedFolder = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const sharedRootId = req.sharedRootId;
  const parentId =
    sharedFolder.parentId === sharedRootId ? null : sharedFolder.parentId;

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

const downloadSharedFolder = async (req, res, next) => {
  try {
    const results = await collectFilesWithPaths(
      req.sharedTargetFolder.id,
      req.sharedTargetFolder.name
    );

    const archive = new ZipArchive("zip", {
      zlib: { level: 6 },
    });

    archive.on("warning", (err) => {
      console.warn(err);
    });

    archive.on("error", (err) => {
      next(err);
    });

    res.attachment(`${req.sharedTargetFolder.name}.zip`);

    archive.pipe(res);

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

//Files
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

const shareFile = [
  // Share a File
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
    try {
      const sharedFile = await sharedQueries.shareFile(fileId, duration);
      res.json({ success: true, file: sharedFile });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err });
    }
  },
];

const unshareFile = async (req, res, next) => {
  const fileId = req.targetFile.id;
  try {
    const unsharedFile = await sharedQueries.unshareFile(fileId);
    res.json({ success: true, file: unsharedFile });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const downloadSharedFile = async (req, res, next) => {
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
