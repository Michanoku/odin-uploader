import path from "path";

import request from "supertest";

import app from "../app.js";

// Get the path and parent id of the users root.
async function getRootPathAndId(agent) {
  const response = await agent.get("/");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Shared File Access", () => {
  const owner = request.agent(app);
  const guest = request.agent(app);

  let folderId;
  let fileId;

  beforeAll(async () => {
    // Register two users, one for sharing and one for accessing
    await owner.post("/register").type("form").send({
      username: "sharedFileOwner",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    await guest.post("/register").type("form").send({
      username: "sharedFileGuest",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root = await getRootPathAndId(owner);

    // Create a folder and upload file to it, save the ids
    const folder = await owner.post(`${root.path}/createFolder`).send({
      folderName: "Documents",
    });
    folderId = folder.body.folder.id;
    const upload = await owner
      .post(`/browser/folder/${folderId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "upload.txt");
    fileId = upload.body.file.id;
  });

  test("cannot share file with duration below minimum", async () => {
    // Attempt to share the file without a duration
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share file with duration above maximum", async () => {
    // Attempt to share the file with the maximum duration exceeded
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 31,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share file with non-integer duration", async () => {
    // Attempt to share file with a duration of bananas, which is nuts, even though a banana is a fruit
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: "banana",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("owner can share file", async () => {
    // Share the file with valid parameters
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 7,
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  describe("after file is shared", () => {
    test("guest can view shared file", async () => {
      // Attempt to access the file as a guest
      const response = await guest.get(`/shared/file/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("upload.txt");
    });

    test("guest can download shared file", async () => {
      // Attempt to download the file as a guest
      const response = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("upload.txt");
    });

    test("owner can unshare file", async () => {
      // Unshare the file
      const response = await owner
        .post(`/browser/folder/${folderId}/unshareFile`)
        .send({
          fileId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("guest loses access after file is unshared", async () => {
      // Try to access the file again after it has been unshared
      const response = await guest.get(`/shared/file/${fileId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot download file after it is unshared", async () => {
      // Try to download the file after it has been unshared
      const response = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(response.status).toBe(404);
    });
  });
});
