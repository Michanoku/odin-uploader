import * as db from "../db/fileQueries.js";

const uploadFile = async (req, res) => {
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
    const reponse = { success: false, error: err };
    console.log(response);
    res.json(response);
  }
};

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

const getBrowser = async (req, res) => {
  const folderId = req.params.folderId ?? null;

  let folder = null;
  let contents = { folders: [], files: [] };
  let tree = [];

  if (folderId) {
    folder = await db.getFolder(folderId);

    if (folder && folder.userId === req.user.id) {
      const [contentsResult, treeResult] = await Promise.all([
        db.getFolderContents(folderId),
        db.createFolderTree(folderId),
      ]);

      contents = contentsResult;
      tree = treeResult;
    } else {
      res.redirect("/notfound") //TODO
    }
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
};

const getShared = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const folderId = req.params.folderId ?? req.sharedFolder.folderId;

  const folder = await db.getSharedFolder(folderId);
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
    parentId: parentId,
  };

  res.render("files/shared", context);
};

// TODO: Rename folder, delete folder, move folder, download folder, open file, rename file, delete file, move file, download file

export { uploadFile, getBrowser, createFolder };
