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
  const folderId = req.params.folderId || null;
  const folder = await db.getFolder(folderId, req.user.id);

  res.render("files/browser", {
    title: "Browser",
    folders: folder.folders,
    files: folder.files,
  });
};

export { uploadFile, getBrowser, createFolder };
