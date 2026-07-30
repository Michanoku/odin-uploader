import path from "path";

import request from "supertest";

import app from "../app.js";

// Get the path and parent id of the users root.
async function getRootPathAndId(agent) {
  const response = await agent.get("/");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Shared Folder Access", () => {
  const owner = request.agent(app);
  const guest = request.agent(app);

  let rootId;
  let parentId;
  let sharedFolderId;
  let childId;
  let grandChildId;
  let privateFolderId;

  beforeAll(async () => {
    // Create owner and guest and all folders required and save their ids
    await owner.post("/register").type("form").send({
      username: "sharedFolderOwner",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    await guest.post("/register").type("form").send({
      username: "sharedGuest",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root = await getRootPathAndId(owner);

    const rootFolder = await owner
      .post(`${root.path}/createFolder`)
      .send({ folderName: "SharedRoot" });

    rootId = rootFolder.body.folder.id;

    const parentFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ folderName: "Parent" });

    parentId = parentFolder.body.folder.id;

    const sharedFolder = await owner
      .post(`/browser/folder/${parentId}/createFolder`)
      .send({ folderName: "Shared Folder" });

    sharedFolderId = sharedFolder.body.folder.id;

    const childFolder = await owner
      .post(`/browser/folder/${sharedFolderId}/createFolder`)
      .send({ folderName: "Child" });

    childId = childFolder.body.folder.id;

    const grandChildFolder = await owner
      .post(`/browser/folder/${childId}/createFolder`)
      .send({ folderName: "Grand Child" });

    grandChildId = grandChildFolder.body.folder.id;

    const privateFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ folderName: "Private Folder" });

    privateFolderId = privateFolder.body.folder.id;
  });

  test("cannot share with duration below minimum", async () => {
    // Attempt to share folder below minimum duration
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share with duration above maximum", async () => {
    // Attempt to share folder above maximum duration
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 31,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share with non-integer duration", async () => {
    // Attempt to share a folder with a duration of nuts, which is just bananas
    const response = await owner
      .post(`/browser/folder/${sharedFolderId}/shareFolder`)
      .send({
        folderId: childId,
        duration: "nuts",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("owner can share a folder", async () => {
    // Share a folder with allowed parameters
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 7,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  describe("after folder is shared", () => {
    test("guest can access shared folder", async () => {
      // Attempt to access the folder as a guest
      const response = await guest.get(`/shared/folder/${sharedFolderId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Shared Folder");
    });

    test("guest can access child folder", async () => {
      // Attempt to access child folder
      const response = await guest.get(`/shared/folder/${childId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Child");
    });

    test("guest can access grandchild folder", async () => {
      // Attempt to access grandchild folder
      const response = await guest.get(`/shared/folder/${grandChildId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Grand Child");
    });

    test("guest cannot access parent folder", async () => {
      // Attempt to access not shared parent folder
      const response = await guest.get(`/shared/folder/${parentId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot access root folder", async () => {
      // Attempt to access not shared root folder
      const response = await guest.get(`/shared/folder/${rootId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot access unrelated private folder", async () => {
      // Attempt to access an entirely different folder
      const response = await guest.get(`/shared/folder/${privateFolderId}`);

      expect(response.status).toBe(404);
    });

    test("guest can download shared folder", async () => {
      const agent = request.agent(app);
      // Download the shared folder
      const download = await guest
        .post(`/shared/folder/${sharedFolderId}/downloadFolder`)
        .send({
          sharedTargetFolderId: childId,
        });

      expect(download.status).toBe(200);
      expect(download.headers["content-type"]).toMatch(/zip/);
      expect(download.headers["content-disposition"]).toContain(".zip");
    });

    test("cannot share child folder if a share already exists", async () => {
      const response = await owner
        .post(`/browser/folder/${sharedFolderId}/shareFolder`)
        .send({
          folderId: childId,
          duration: 7,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("parent folder can be shared as a separate share group", async () => {
      const response = await owner
        .post(`/browser/folder/${rootId}/shareFolder`)
        .send({
          folderId: parentId,
          duration: 7,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("new folder created inside shared folder is automatically shared", async () => {
      const newFolder = await owner
        .post(`/browser/folder/${sharedFolderId}/createFolder`)
        .send({
          folderName: "Future Shared Folder",
        });

      const newFolderId = newFolder.body.folder.id;

      expect(newFolder.status).toBe(200);
      expect(newFolder.body.folder.shareId).toBeTruthy();

      const response = await guest.get(`/shared/folder/${newFolderId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Future Shared Folder");
    });

    test("new file created inside shared folder is automatically shared", async () => {
      const upload = await owner
        .post(`/browser/folder/${sharedFolderId}/upload`)
        .attach(
          "file",
          path.resolve("tests/files/test.txt"),
          "future-file.txt"
        );

      const newFileId = upload.body.file.id;

      expect(upload.status).toBe(200);
      expect(upload.body.file.shareId).toBeTruthy();

      const response = await guest.get(`/shared/file/${newFileId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("future-file.txt");
    });

    test("cannot separately share file that is already part of a share", async () => {
      const upload = await owner
        .post(`/browser/folder/${sharedFolderId}/upload`)
        .attach(
          "file",
          path.resolve("tests/files/test.txt"),
          "already-shared.txt"
        );

      const fileId = upload.body.file.id;

      expect(upload.status).toBe(200);
      expect(upload.body.file.shareId).toBeTruthy();

      const response = await owner
        .post(`/browser/folder/${sharedFolderId}/shareFile`)
        .send({
          fileId,
          duration: 7,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("owner can unshare folder", async () => {
      // Unshare the folder
      const response = await owner
        .post(`/browser/folder/${rootId}/unshareFolder`)
        .send({
          folderId: parentId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("guest loses access after folder is unshared", async () => {
      // Attempt to access the unshared folder
      const response = await guest.get(`/shared/folder/${parentId}`);

      expect(response.status).toBe(404);
    });
  });
});
