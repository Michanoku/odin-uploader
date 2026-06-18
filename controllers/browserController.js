import * as db from "../db/browserQueries.js";
import { getFolderContents, getBreadcrumbs } from "../lib/browserUtils.js";

// Folders
const createFolder = async (req, res) => {
  console.log(req.body);
  try {
    const folderData = {
      name: req.body.newFolderName,
      parentId: req.body.currentFolder === "" ? null : req.body.currentFolder,
      userId: req.user.id,
    };
    const newFolder = await db.createFolder(folderData);
    res.json({ success: true, folder: newFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const getFolder = async (req, res, next) => {
  const folder = req.folder ?? null;
  const folderId = folder?.id ?? null;
  let contents = { folders: [], files: [] };
  let breadcrumbs = [];

  try {
    if (folder) {
      const [contentsResult, treeResult] = await Promise.all([
        getFolderContents({ folderId: folderId }),
        getBreadcrumbs({ folderId: folderId }),
      ]);
      contents = contentsResult;
      tree = treeResult;
    } else {
      contents = await getFolderContents({ userId: req.user.id });
    }

    const context = {
      title: "Browser",
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
const uploadFile = async (req, res, next) => {
  console.log(req.file);
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
    const reponse = { success: true, file: newFile };
    console.log(response);
    res.json(response);
  } catch (err) {
    return next(err);
  }
};

const getFile = async (req, res, next) => {
  const file = req.file;
  const context = {}
   res.render("files/file", context);
};

const renameFile = async (req, res) => {
  // TODO
};

const moveFile = async (req, res) => {
  // TODO
};

const deleteFile = async (req, res) => {
 // TODO
};

const shareFile = async (req, res) => {
  // TODO
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
  shareFile,
};
