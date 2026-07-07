import path from "path";
import request from "supertest";
import app from "../app.js";

async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Shared File Access", () => {
  const owner = request.agent(app);
  const guest = request.agent(app);

  let folderId;
  let fileId;

  beforeAll(async () => {
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

    const folder = await owner.post(`${root.path}/createFolder`).send({
      newFolderName: "Documents",
    });

    folderId = folder.body.folder.id;

    const upload = await owner
      .post(`/browser/folder/${folderId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "upload.txt");

    fileId = upload.body.file.id;
  });

  test("cannot share file with duration below minimum", async () => {
    const res = await owner.post(`/browser/folder/${folderId}/shareFile`).send({
      fileId,
      duration: 0,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("cannot share file with duration above maximum", async () => {
    const res = await owner.post(`/browser/folder/${folderId}/shareFile`).send({
      fileId,
      duration: 31,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("cannot share file with non-integer duration", async () => {
    const res = await owner.post(`/browser/folder/${folderId}/shareFile`).send({
      fileId,
      duration: "banana",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("owner can share file", async () => {
    const res = await owner.post(`/browser/folder/${folderId}/shareFile`).send({
      fileId,
      duration: 7,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  describe("after file is shared", () => {
    test("guest can view shared file", async () => {
      const res = await guest.get(`/shared/file/${fileId}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("upload.txt");
    });

    test("guest can download shared file", async () => {
      const res = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("upload.txt");
    });

    test("owner can unshare file", async () => {
      const res = await owner
        .post(`/browser/folder/${folderId}/unshareFile`)
        .send({
          fileId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("guest loses access after file is unshared", async () => {
      const res = await guest.get(`/shared/file/${fileId}`);

      expect(res.status).toBe(404);
    });

    test("guest cannot download file after it is unshared", async () => {
      const res = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(res.status).toBe(404);
    });
  });
});
