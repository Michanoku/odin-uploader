import * as sharedQueries from "../db/sharedQueries.js";
import { getFolder } from "../db/browserQueries.js";
import { getFolderContents, getBreadcrumbs } from "../lib/browserUtils.js";

// Folders
const shareFolder = async (req, res) => {
  const folderId = req.body.folderId;
  const duration = parseInt(req.body.duration); // 1 - 30 days
  try {
    const sharedFolder = await sharedQueries.shareFolder(folderId, duration);
    res.json({ success: true, folder: sharedFolder });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err });
  }
};

const getSharedFolder = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const folderId = req.params.folderId ?? req.sharedFolder.folderId;

  const folder = await getFolder({ folderId });
  const parentId = folderId === sharedFolder ? null : folder.parentId;

  const [contents, breadcrumbs] = await Promise.all([
    getFolderContents({ folderId: folderId }),
    getBreadcrumbs({ folderId: folderId }),
  ]);

  const context = {
    title: "Shared folder",
    contents,
    breadcrumbs,
    folderId,
    sharedFolder,
    parentId: parentId,
  };

  res.render("files/shared", context);
};

//Files
const getSharedFile = async (req, res, next) => {
  const file = req.file;
  // TODO
};

//Files
const shareFile = async (req, res, next) => {
  const file = req.file;
  // TODO
};

// Todo share single fil

export {
    shareFolder,
    getSharedFolder,
    getSharedFile,
    shareFile,
}