import {
  getFolder,
  getAllSubfolders,
  getAllFiles,
  calculateTotalSize,
  getFolderContentWithPaths,
} from "../db/browserQueries.js";

const USER_LIMIT = 5 * 1024 * 1024; // 5MB
const uploadFolder =
  process.env.NODE_ENV === "test" ? "uploads/test" : "uploads";

// Helper to get all folder contents for shared or non shared folders
const getFolderContents = async (folderId) => {
  const [folders, files] = await Promise.all([
    getAllSubfolders(folderId),
    getAllFiles(folderId),
  ]);

  return { folders, files };
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

// Format the file size saved as bytes to a more easily legible format.
// (GB and TB are just for fun at this point)
const formatFileSize = (bytes) => {
  const units = ["B", "KB", "MB", "GB", "TB"];

  let size = bytes;
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

  let result = [];

  // Add the files of the folder
  for (const file of folder.files) {
    result.push({
      diskPath: `${uploadFolder}/${file.filename}`,
      zipPath: `${currentPath}/${file.originalname}`,
    });
  }

  // Continue with recursion to add all filenames and paths (OMG recursion)
  for (const child of folder.children) {
    result.push(
      ...(await collectFilesWithPaths(child.id, `${currentPath}/${child.name}`))
    );
  }

  return result;
};

const limitExceeded = async (userId, fileSize) => {
  const currentFileSize = await calculateTotalSize(userId);
  return (currentFileSize + fileSize) > USER_LIMIT;
}

export {
  getFolderContents,
  getBreadcrumbs,
  formatFileSize,
  formatDate,
  collectFilesWithPaths,
  limitExceeded,
};
