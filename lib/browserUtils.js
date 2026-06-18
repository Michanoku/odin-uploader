import { getFolder, getAllSubfolders, getAllFiles } from "../db/browserQueries.js";

const getFolderContents = async ({ folderId, userId }) => {
  const [folders, files] = await Promise.all([
    getAllSubfolders({ folderId, userId }),
    getAllFiles({ folderId, userId }),
  ]);

  return { folders, files };
};

const getBreadcrumbs = async ({ folderId, rootId = null }) => {
  const breadcrumbs = [];
  let currentId = folderId;
  while (currentId !== null) {
    const folder = await getFolder({ folderId: currentId })
    if (!folder) break;
    breadcrumbs.push({ id: folder.id, name: folder.name });
    if (rootId && rootId === currentId) break;
    currentId = folder.parentId;
  }
  return breadcrumbs.reverse();
};

export { getFolderContents, getBreadcrumbs }