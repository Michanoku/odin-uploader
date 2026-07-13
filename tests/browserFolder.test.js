import path from "path";

import request from "supertest";

import app from "../app.js";

// Get the path and parent id of the users root.
async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Folder Operations", () => {
  const agent = request.agent(app);

  // Register the user for the test
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

      // Attempt to create folder without a name
      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a root folder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a new folder in the users root folder
      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "Documents",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.name).toBe("Documents");
    });

    test("user cannot create two folders with the same name in the same parent folder", async () => {
      const root = await getRootPathAndId(agent);

      // Attempt to create a new folder with the same name of an existing folder
      const response = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "Documents",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a subfolder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder to use as a parent and get the id
      const firstResponse = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "ParentFolder",
      });
      const parentId = firstResponse.body.folder.id;

      // Attempt to create the new folder within the previous folder
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

      // Create a new folder and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder",
        });
      const folderId = creationResponse.body.folder.id;

      // Try to rename the folder to blank
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId,
        updatedFolderName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user cannot rename rootfolder", async () => {
      const root = await getRootPathAndId(agent);

      // Try to rename the users root folder
      const response = await agent.post(`${root.path}/renameFolder`).send({
        folderId: root.id,
        updatedFolderName: "RenamedRoot",
      });

      expect(response.status).toBe(403);
    });

    test("user can rename a folder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder to be renamed and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder2",
        });
      const folderId = creationResponse.body.folder.id;

      // Attempt to rename the folder
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

      // Create folder to rename and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NiceFolder3",
        });
      const folderId = creationResponse.body.folder.id;

      // Try to rename the folder to name of existing folder
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

      // Create a folder to move and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "MoveThis",
        });
      const moveThis = creationResponse.body.folder.id;

      //　Create a folder to move the other folder into and get the id
      const creationResponse2 = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "IntoThis",
        });
      const intoThis = creationResponse2.body.folder.id;

      // Tryo to moveThis folder into intoThis folder
      const response = await agent.post(`${root.path}/moveFolder`).send({
        folderId: moveThis,
        updatedParentId: intoThis,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("user can move folder back into parent", async () => {
      const root = await getRootPathAndId(agent);

      // Create two folders, get their ids and move one into the other
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

      // Try to remove one folder out back into the root
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

      // Create the parent folder to try to move into
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ParentFolder2",
        });
      const parentId = creationResponse.body.folder.id;

      // Create two folders with the same name, one in the root and one in the parent
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

      // Try to remove folder from root to parent, where same name folder already exists
      const response = await agent.post(`${root.path}/moveFolder`).send({
        folderId: folderId,
        updatedParentId: parentId,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user cannot move rootfolder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a target folder to try to move root into
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "NewRoot",
        });
      const newRoot = creationResponse.body.folder.id;

      // Try to move the root folder into the folder
      const response = await agent.post(`${root.path}/moveFolder`).send({
        folderId: root.id,
        updatedParentId: newRoot,
      });
      expect(response.status).toBe(403);
    });
  });

  describe("Folder Reading", () => {
    test("user can open root folder", async () => {
      const root = await getRootPathAndId(agent);

      // Access root
      const response = await agent.get(`${root.path}`);

      expect(response.status).toBe(200);
    });

    test("user can open a folder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ICanGoInHere",
        });
      const folderId = creationResponse.body.folder.id;

      // Access the folder
      const response = await agent.get(`/browser/folder/${folderId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Folder Deletion", () => {
    test("user can delete a folder", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder and get the id
      const creationResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          newFolderName: "ICanBeDeleted",
        });
      const folderId = creationResponse.body.folder.id;

      // Delete the folder
      const response = await agent.post(`${root.path}/deleteFolder`).send({
        folderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.id).toBe(folderId);
    });

    test("user cannot delete root folder", async () => {
      const root = await getRootPathAndId(agent);

      // Try to delete the root folder
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

    // Register user and create folder and get id
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

    // Register second user
    await user2.post("/register").type("form").send({
      username: "intruder2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root2 = await getRootPathAndId(user2);

    // Try to maliciously rename the other users folder with the folder id
    const response = await user2.post(`${root2.path}/renameFolder`).send({
      folderId,
      updatedFolderName: "Hacked",
    });

    expect(response.status).toBe(404);
  });
});

describe("Recursive Folder Download", () => {
  test("downloads a zip containing all nested folders and files", async () => {
    const agent = request.agent(app);

    // Register a new user
    await agent.post("/register").type("form").send({
      username: "downloaduser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root = await getRootPathAndId(agent);

    // Create the root folder for the download, as well as several descendants
    const rootFolder = await agent.post(`${root.path}/createFolder`).send({
      newFolderName: "Root",
    });
    const rootId = rootFolder.body.folder.id;
    const child = await agent
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({
        newFolderName: "Child",
      });
    const childId = child.body.folder.id;
    const grandchild = await agent
      .post(`/browser/folder/${childId}/createFolder`)
      .send({
        newFolderName: "Grandchild",
      });
    const grandchildId = grandchild.body.folder.id;

    // Upload some files to some folders
    await agent
      .post(`/browser/folder/${rootId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "root.txt");
    await agent
      .post(`/browser/folder/${childId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "child.txt");
    await agent
      .post(`/browser/folder/${grandchildId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "grandchild.txt");

    // Try to download the folders
    const download = await agent.post(`${root.path}/downloadFolder`).send({
      folderId: rootId,
    });

    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toMatch(/zip/);
    expect(download.headers["content-disposition"]).toContain(".zip");
  });
});
