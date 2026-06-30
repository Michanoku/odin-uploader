import * as sharedQueries from "../db/sharedQueries.js";
import { getFolder } from "../db/browserQueries.js";
import { getFolderContents, getBreadcrumbs } from "../lib/browserUtils.js";
import { body, validationResult, matchedData } from "express-validator";

const durationValidation = [
  body("duration")
    .toInt()
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be an integer between 1 and 30"),
];
// Folders
const shareFolder = [
  // Create a new folder in the users tree
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

const getSharedFolder = async (req, res) => {
  const sharedFolder = req.sharedFolder;
  const sharedDescendant = req.sharedDescendant;

  const currentFolder = sharedDescendant ? sharedDescendant : sharedFolder;

  const parentId = currentFolder.parentId ? currentFolder.parentId : null;

  const [contents, breadcrumbs] = await Promise.all([
    getFolderContents({ folderId: currentFolder.id }),
    getBreadcrumbs({ folderId: currentFolder.id }),
  ]);

  const context = {
    title: "Shared folder",
    contents,
    breadcrumbs,
    folderId: currentFolder.id,
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

// Todo share single file

export { shareFolder, getSharedFolder, getSharedFile, shareFile };
