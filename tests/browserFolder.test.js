import request from "supertest";
import app from "../app.js";

async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

//TODO VALIDATION TESTING
describe("Folder Operations", () => {
  const agent = request.agent(app);

  beforeAll(async () => {
    await agent.post("/register").type("form").send({
      username: "foldertestuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
  });

  describe("Folder Creation", () => {
    test("user cannot create a folder without a name", async () => {
      const root = await getRootPathAndId(agent);

      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a root folder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "Documents",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.name).toBe("Documents");
    });

    test("user cannot create two folders with the same name in the same parent folder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "Documents",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a subfolder", async () => {
      const root = await getRootPathAndId(agent);
      const firstResponse = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "ParentFolder",
      });

      const parentId = firstResponse.body.folder.id;
      const response = await agent
        .post(`/browser/folder/${parentId}/createFolder`)
        .send({
          newFolderName: "Pictures",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.parentId).toBe(parentId);
    });
  });

  describe("Folder Rename", () => {
    test("user cannot rename a folder to blank", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder",
        });

      const folderId = creationResponse.body.folder.id;
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId,
        updatedFolderName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user cannot rename rootfolder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId: root.id,
        updatedFolderName: "RenamedRoot",
      });

      expect(response.status).toBe(403);
    });

    test("user can rename a folder", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder2",
        });

      const folderId = creationResponse.body.folder.id;
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId,
        updatedFolderName: "Photos",
      });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.name).toBe("Photos");
    });

    test("user cannot rename a folder to the same name as existing folder in the same location", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder3",
        });
      const folderId = creationResponse.body.folder.id;
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId,
        updatedFolderName: "Photos",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Folder Move", () => {
    test("user can move a folder", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "MoveThis",
        });
      const moveThis = creationResponse.body.folder.id;
      const creationResponse2 = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "IntoThis",
        });
      const intoThis = creationResponse2.body.folder.id;
      const response = await agent.post(`${root.path}/moveFolder`).send({
        folderId: moveThis,
        updatedParentId: intoThis,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("user can move folder back into parent", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "MoveThis2",
        });
      const moveThis = creationResponse.body.folder.id;
      const creationResponse2 = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "IntoThis2",
        });
      const intoThis = creationResponse2.body.folder.id;
      await agent.post(`${root.path}/moveFolder`).send({
        folderId: moveThis,
        updatedParentId: intoThis,
      });
      const response = await agent
        .post(`/browser/folder/${intoThis}/moveFolder`)
        .send({
          folderId: moveThis,
          updatedParentId: root.id,
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.parentId).toBe(root.id);
    });

    test("user can't move folder if folder of same name exists", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ParentFolder2",
        });
      const parentId = creationResponse.body.folder.id;
      const creationResponse2 = await agent
        .post(`/browser/folder/${parentId}/createFolder`)
        .send({
          newFolderName: "SameName",
        });
      const creationResponse3 = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "SameName",
        });
      const folderId = creationResponse3.body.folder.id;
      const response = await agent.post(`${root.path}/moveFolder`).send({
        folderId: folderId,
        updatedParentId: parentId,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user cannot move rootfolder", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NewRoot",
        });
      const newRoot = creationResponse.body.folder.id;
      const response = await agent
        .post(`${root.path}/moveFolder`)
        .send({
          folderId: root.id,
          updatedParentId: newRoot,
        });
      expect(response.status).toBe(403);
    });
  });

  describe("Folder Reading", () => {
    test("user can open root folder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent.get(`${root.path}`);

      expect(response.status).toBe(200);
    });

    test("user can open a folder", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ICanGoInHere",
        });

      const folderId = creationResponse.body.folder.id;
      const response = await agent.get(`/browser/folder/${folderId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Folder Deletion", () => {
    test("user can delete a folder", async () => {
      const root = await getRootPathAndId(agent);
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ICanBeDeleted",
        });

      const folderId = creationResponse.body.folder.id;
      const response = await agent.post(`${root.path}/deleteFolder`).send({
        folderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.id).toBe(folderId);
    });

    test("user cannot delete root folder", async () => {
      const root = await getRootPathAndId(agent); 

      const response = await agent.post(`${root.path}/deleteFolder`).send({
        folderId: root.id,
      });

      expect(response.status).toBe(403);
    });
  });
});

describe("Folder Ownership", () => {
  test("user cannot access another user's folder", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    // Register user1 and create folder
    await user1.post("/register").type("form").send({
      username: "owner",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root1 = await getRootPathAndId(user1);
    const createResponse = await user1.post(`${root1.path}/createFolder`).send({
      newFolderName: "Secret Folder",
    });

    const folderId = createResponse.body.folder.id;

    // Register user2 and try to access the folder
    await user2.post("/register").type("form").send({
      username: "intruder",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const response = await user2.get(`/browser/folder/${folderId}`);

    expect(response.status).toBe(404);
  });

  test("user cannot rename another user's folder", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    await user1.post("/register").type("form").send({
      username: "owner2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root1 = await getRootPathAndId(user1);
    const createResponse = await user1.post(`${root1.path}/createFolder`).send({
      newFolderName: "Secret Folder",
    });

    const folderId = createResponse.body.folder.id;

    await user2.post("/register").type("form").send({
      username: "intruder2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root2 = await getRootPathAndId(user2);
    const response = await user2.post(`${root2.path}/renameFolder`).send({
      folderId,
      updatedFolderName: "Hacked",
    });

    expect(response.status).toBe(404);
  });
});
