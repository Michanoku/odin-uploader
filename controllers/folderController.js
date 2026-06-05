import * as db from "../db/folderQueries.js";

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
  let tree = [];

  try {
    if (folder) {
      const [contentsResult, treeResult] = await Promise.all([
        db.getFolderContents(folderId),
        db.createFolderTree(folderId),
      ]);

      contents = contentsResult;
      tree = treeResult;
    } else {
      contents = await db.getRootContents(req.user.id);
    }

    const context = {
      title: "Browser",
      folders: contents.folders,
      files: contents.files,
      tree,
      folderId,
      parentId: folder?.parentId ?? null,
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

const shareFolder = async (req, res) => {
  const folderId = req.body.folderId;
  const duration = parseInt(req.body.duration); // 1 - 30 days
  try {
    const sharedFolder = await db.shareFolder(folderId, duration);
    res.json({ success: true, folder: sharedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const getShared = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const folderId = req.params.folderId ?? req.sharedFolder.folderId;

  const folder = await db.getFolder(folderId);
  const parentId = folderId === sharedFolder ? null : folder.parentId;

  const [contents, tree] = await Promise.all([
    db.getFolderContents(folderId),
    db.createFolderTree(folderId, sharedFolder.folderId),
  ]);

  const context = {
    title: "Shared folder",
    folders: contents.folders,
    files: contents.files,
    tree,
    folderId,
    sharedFolder,
    parentId: parentId,
  };

  res.render("files/shared", context);
};

// TODO: download folder 

export {
  createFolder,
  getFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  shareFolder,
  getShared,
};
