import * as db from "../db/fileQueries.js";

const getUpload = (req, res) => {
  res.render("files/upload", { title: "Upload" });
};

const postUpload = async (req, res) => {
  console.log(req.file);
  try {
    const fileData = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      filename: req.file.filename,
      size: req.file.size,
      folderId: req.body.currentFolder === "" ? null : req.body.currentFolder,
      userId: req.user.id,
    }
    await db.saveFile(fileData);
    res.json({"success": true, "file": fileData})
  } catch (err) {
    console.log(err);
    res.json({"success": false, "error": err})
  }
};

const getBrowser = async (req, res) => {
  const folderId = req.params.folderId || null;
  const folder = await db.getFolder(folderId, req.user.id);

  res.render("files/browser", {title: "Browser", folders: folder.folders, files: folder.files});
}

export { getUpload, postUpload, getBrowser };
