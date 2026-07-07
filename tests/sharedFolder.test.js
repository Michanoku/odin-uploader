import request from "supertest";
import app from "../app.js";

async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
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
      .send({ newFolderName: "SharedRoot" });

    rootId = rootFolder.body.folder.id;

    const parentFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ newFolderName: "Parent" });

    parentId = parentFolder.body.folder.id;

    const sharedFolder = await owner
      .post(`/browser/folder/${parentId}/createFolder`)
      .send({ newFolderName: "Shared Folder" });

    sharedFolderId = sharedFolder.body.folder.id;

    const childFolder = await owner
      .post(`/browser/folder/${sharedFolderId}/createFolder`)
      .send({ newFolderName: "Child" });

    childId = childFolder.body.folder.id;

    const grandChildFolder = await owner
      .post(`/browser/folder/${childId}/createFolder`)
      .send({ newFolderName: "Grand Child" });

    grandChildId = grandChildFolder.body.folder.id;

    const privateFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ newFolderName: "Private Folder" });

    privateFolderId = privateFolder.body.folder.id;
  });

  test("cannot share with duration below minimum", async () => {
    const res = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("cannot share with duration above maximum", async () => {
    const res = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 31,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("cannot share with non-integer duration", async () => {
    const res = await owner
      .post(`/browser/folder/${sharedFolderId}/shareFolder`)
      .send({
        folderId: childId,
        duration: "banana",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("owner can share a folder", async () => {
    const res = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  describe("after folder is shared", () => {
    test("guest can access shared folder", async () => {
      const res = await guest.get(`/shared/folder/${sharedFolderId}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Shared Folder");
    });

    test("guest can access child folder", async () => {
      const res = await guest.get(`/shared/folder/${childId}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Child");
    });

    test("guest can access grandchild folder", async () => {
      const res = await guest.get(`/shared/folder/${grandChildId}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Grand Child");
    });

    test("guest cannot access parent folder", async () => {
      const res = await guest.get(`/shared/folder/${parentId}`);

      expect(res.status).toBe(404);
    });

    test("guest cannot access root folder", async () => {
      const res = await guest.get(`/shared/folder/${rootId}`);

      expect(res.status).toBe(404);
    });

    test("guest cannot access unrelated private folder", async () => {
      const res = await guest.get(`/shared/folder/${privateFolderId}`);

      expect(res.status).toBe(404);
    });

    test("guest can download shared folder", async () => {
      const agent = request.agent(app);
      const download = await guest
        .post(`/shared/folder/${sharedFolderId}/downloadFolder`)
        .send({
          sharedTargetFolderId: childId,
        });

      console.log(download.body);
      expect(download.status).toBe(200);
      expect(download.headers["content-type"]).toMatch(/zip/);
      expect(download.headers["content-disposition"]).toContain(".zip");
    });

    test("owner can unshare folder", async () => {
      const res = await owner
        .post(`/browser/folder/${parentId}/unshareFolder`)
        .send({
          folderId: sharedFolderId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("guest loses access after folder is unshared", async () => {
      const res = await guest.get(`/shared/folder/${sharedFolderId}`);

      expect(res.status).toBe(404);
    });
  });
});
