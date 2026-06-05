import request from "supertest";
import app from "../app.js";

describe("Shared Folder Access", () => {
  const sharedFolderOwner = request.agent(app);
  const sharedFolderGuest = request.agent(app);

  let rootId;
  let parentId;
  let sharedId;
  let childId;
  let grandChildId;

  beforeAll(async () => {
    await sharedFolderOwner.post("/register").type("form").send({
      username: "sharedFolderOwner",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    // create root
    const rootRes = await sharedFolderOwner.post("/createFolder").send({
      newFolderName: "Root",
      currentFolder: "",
    });
    rootId = rootRes.body.folder.id;

    // create parent
    const parentRes = await sharedFolderOwner.post("/createFolder").send({
      newFolderName: "Parent",
      currentFolder: rootId,
    });
    parentId = parentRes.body.folder.id;

    // create shared folder
    const sharedRes = await sharedFolderOwner.post("/createFolder").send({
      newFolderName: "Shared",
      currentFolder: parentId,
    });
    sharedId = sharedRes.body.folder.id;

    // create child
    const childRes = await sharedFolderOwner.post("/createFolder").send({
      newFolderName: "Child",
      currentFolder: sharedId,
    });
    childId = childRes.body.folder.id;

    // create grandchild
    const grandRes = await sharedFolderOwner.post("/createFolder").send({
      newFolderName: "GrandChild",
      currentFolder: childId,
    });
    grandChildId = grandRes.body.folder.id;

    // share the shared folder
    await sharedFolderOwner.post("/shareFolder").send({
      folderId: sharedId,
      duration: 7,
    });

    await sharedFolderGuest.post("/register").type("form").send({
      username: "sharedGuest",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
  });

  test("guest can access shared folder root", async () => {
    const res = await sharedFolderGuest.get(`/shared/${sharedId}`);

    expect(res.status).toBe(200);
  });

  test("guest can access child of shared folder", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${sharedId}/folder/${childId}`
    );

    expect(res.status).toBe(200);
  });

  test("guest can access grandchild of shared folder", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${sharedId}/folder/${grandChildId}`
    );

    expect(res.status).toBe(200);
  });

  test("guest cannot access parent above shared root", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${sharedId}/folder/${parentId}`
    );

    expect(res.status).toBe(404);
  });

  test("guest cannot access root above shared root", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${sharedId}/folder/${rootId}`
    );

    expect(res.status).toBe(404);
  });
});
