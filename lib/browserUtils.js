import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

import { supabase } from "../config/supabase.js";
import {
  getFolder,
  getAllSubfolders,
  getAllFiles,
  calculateTotalSize,
  getFolderContentWithPaths,
  collectFolderIds,
  getAllFilesFromSubfolders,
  updateFolder,
  updateFile,
} from "../db/browserQueries.js";

import {
  unshareFolder,
  unshareFile,
  deleteShare,
} from "../db/sharedQueries.js";
import { MAX_USER_STORAGE } from "../config/filesize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewsPath = path.join(__dirname, "../views");

// Helper to get all folder contents for shared or non shared folders
const getFolderContents = async (folderId) => {
  const [folders, files] = await Promise.all([
    getAllSubfolders(folderId),
    getAllFiles(folderId),
  ]);

  return { folders, files };
};

// Helper to create HTML from folder and file data
const renderFolderContents = async (
  folderContents,
  currentFolder,
  formatDate
) => {
  let html = "";

  for (const folder of folderContents.folders) {
    html += await ejs.renderFile(
      path.join(viewsPath, "files/partials/folder.ejs"),
      { folder, currentFolder, formatDate, view: "folder" }
    );
  }

  for (const file of folderContents.files) {
    html += await ejs.renderFile(
      path.join(viewsPath, "files/partials/file.ejs"),
      { file, currentFolder, formatDate, view: "folder" }
    );
  }

  return html;
};

// Helper to check share status and remove it if its expired:
const checkShare = async (object) => {
  if (object?.share?.expiresAt < new Date()) {
    await deleteShare(object.shareId);
    object.shareId = null;
    object.share = null;
    object.rootShare = null;
  }

  return object;
};

// Create breadrcrumbs from folder id and root id (moving up the tree from folder to root)
const getBreadcrumbs = async ({ folderId, rootId = null }) => {
  const breadcrumbs = [];

  // Keep going through the folders and save the parent id as current until no more parent exists
  let currentId = folderId;
  while (currentId !== null) {
    const folder = await getFolder({ folderId: currentId });
    if (!folder) break;
    breadcrumbs.push({ id: folder.id, name: folder.name });
    if (rootId && rootId === currentId) break;
    currentId = folder.parentId;
  }
  return breadcrumbs.reverse();
};

const cascadeShareIdChange = async (sourceId, shareId) => {
  // Get all subfolder ids and fileids within those folders
  const folderIds = await collectFolderIds(sourceId);
  const fileIds = await getAllFilesFromSubfolders(folderIds);
  // Change the share ID in all of them.
  await Promise.all([
    updateFolder(sourceId, { shareId }),
    ...folderIds.map((folderId) => updateFolder(folderId, { shareId })),
    ...fileIds.map((fileId) => updateFile(fileId, { shareId })),
  ]);
  return;
};

const shareManager = async (source, target, sourceType) => {
  const shareState = {
    sourceShared: Boolean(source.shareId),
    sourceRoot: source.rootShare,
    targetShared: Boolean(target.shareId),
    sameShare:
      source.shareId && target.shareId && source.shareId === target.shareId,
  };
  if (shareState.sameShare) return;

  if (!shareState.sourceShared && !shareState.targetShared) return;
  if (!shareState.sourceShared && shareState.targetShared) {
    if (sourceType === "folder") {
      // set all subfolders and files to the same shareID
      await cascadeShareIdChange(source.id, target.shareId);
    } else {
      await updateFile(source.id, { shareId: target.shareId });
    }
    return;
  }
  if (shareState.sourceShared && !shareState.targetShared) {
    if (shareState.sourceRoot) return;
    if (sourceType === "folder") {
      // delete shareID from all descendancts
      await cascadeShareIdChange(source.id, null);
    } else {
      await updateFile(source.id, { shareId: null });
    }
    return;
  }
  if (shareState.sourceShared && shareState.targetShared) {
    // Delete current share object if source is root
    if (shareState.sourceRoot) {
      if (sourceType === "folder") {
        await unshareFolder(source.id);
      } else {
        await unshareFile(source.id);
      }
    }
    // Update source share id
    if (sourceType === "folder") {
      // update all descendants to new share id
      await cascadeShareIdChange(source.id, target.shareId);
    } else {
      await updateFile(source.id, { shareId: target.shareId });
    }
    return;
  }
};
// Format the file size saved as bytes to a more easily legible format.
// (GB and TB are just for fun at this point)
const formatFileSize = (bytes) => {
  const units = ["B", "KB", "MB", "GB", "TB"];

  let size = bytes ? bytes : 0;
  let unitIndex = 0;

  // While the size is still bigger than 1024 and the index is not at the end, divide and move up the index
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // Return the final result and the unit
  return `${parseFloat(size.toFixed(1))} ${units[unitIndex]}`;
};

// Format the date to follow YYYY-MM-DD, which happens to be what Sweden uses.
const formatDate = (date) => {
  return new Date(date).toLocaleString("sv-SE");
};

// A helper to collect all files with their paths, so the zip file can be created from the information
const collectFilesWithPaths = async (folderId, currentPath = "") => {
  const folder = await getFolderContentWithPaths(folderId);

  const files = await Promise.all(
    folder.files.map(async (file) => {
      const { data, error } = await supabase.storage
        .from("User Files")
        .download(file.filename);

      if (error) {
        throw error;
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      return {
        buffer,
        zipPath: `${currentPath}/${file.originalname}`,
      };
    })
  );

  const children = await Promise.all(
    folder.children.map((child) =>
      collectFilesWithPaths(child.id, `${currentPath}/${child.name}`)
    )
  );

  return [...files, ...children.flat()];
};

const limitExceeded = async (userId, fileSize) => {
  const currentFileSize = await calculateTotalSize(userId);
  return currentFileSize + fileSize > MAX_USER_STORAGE;
};

export {
  checkShare,
  getFolderContents,
  renderFolderContents,
  getBreadcrumbs,
  formatFileSize,
  formatDate,
  collectFilesWithPaths,
  limitExceeded,
  shareManager,
};
