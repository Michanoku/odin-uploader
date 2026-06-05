import * as db from "../db/fileQueries.js";

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



// TODO: open file, rename file, delete file, move file, download file

export {
  uploadFile,
};
