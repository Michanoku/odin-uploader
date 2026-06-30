import request from "supertest";
import app from "../app.js";

async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Shared Folder Access", () => {
  const sharedFolderOwner = request.agent(app);
  const sharedFolderGuest = request.agent(app);

  let rootId;
  let parentId;
  let folderId;
  let childId;
  let grandChildId;

  beforeAll(async () => {
    await sharedFolderOwner.post("/register").type("form").send({
      username: "sharedFolderOwner",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    
    const rootOwner = await getRootPathAndId(sharedFolderOwner);
    // create root
    const rootRes = await sharedFolderOwner.post(`${rootOwner.path}/createFolder`).send({
      newFolderName: "SharedRoot",
    });
    rootId = rootRes.body.folder.id;

    // create parent
    const parentRes = await sharedFolderOwner.post(`/browser/folder/${rootId}/createFolder`).send({
      newFolderName: "SharedParent",
    });
    parentId = parentRes.body.folder.id;

    // create shared folder
    const folderRes = await sharedFolderOwner.post(`/browser/folder/${parentId}/createFolder`).send({
      newFolderName: "SharedFolder",
    });
    folderId = folderRes.body.folder.id;

    // create child
    const childRes = await sharedFolderOwner.post(`/browser/folder/${folderId}/createFolder`).send({
      newFolderName: "SharedChild",
    });
    childId = childRes.body.folder.id;

    // create grandchild
    const grandRes = await sharedFolderOwner.post(`/browser/folder/${childId}/createFolder`).send({
      newFolderName: "SharedGrandChild",
    });
    grandChildId = grandRes.body.folder.id;

    // share the shared folder
    const sharedFolder = await sharedFolderOwner.post(`/browser/folder/${parentId}/shareFolder`).send({
      folderId,
      duration: 7,
    });

    await sharedFolderGuest.post("/register").type("form").send({
      username: "sharedGuest",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
  });

  test("guest can access shared folder root", async () => {
    const res = await sharedFolderGuest.get(`/shared/${folderId}`);

    expect(res.status).toBe(200);
  });

  test("guest can access child of shared folder", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${folderId}/folder/${childId}`
    );

    expect(res.status).toBe(200);
  });

  test("guest can access grandchild of shared folder", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${folderId}/folder/${grandChildId}`
    );

    expect(res.status).toBe(200);
  });

  test("guest cannot access parent above shared root", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${folderId}/folder/${parentId}`
    );

    expect(res.status).toBe(404);
  });

  test("guest cannot access root above shared root", async () => {
    const res = await sharedFolderGuest.get(
      `/shared/${folderId}/folder/${rootId}`
    );

    expect(res.status).toBe(404);
  });
});
