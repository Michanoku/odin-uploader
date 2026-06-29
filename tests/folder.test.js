import request from "supertest";
import app from "../app.js";

//TODO VALIDATION TESTING
describe("Folder Operations", () => {
  const agent = request.agent(app);

  let folderId;
  let parentFolderId;

  beforeAll(async () => {
    await agent.post("/register").type("form").send({
      username: "foldertestuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
  });

  describe("Folder Creation", () => {
    test("user cannot create a folder without a name", async () => {
      const response = await agent.post("/createFolder").send({
        newFolderName: "",
        currentFolder: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a root folder", async () => {
      const response = await agent.post("/createFolder").send({
        newFolderName: "Documents",
        currentFolder: "",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.name).toBe("Documents");
      expect(response.body.folder.parentId).toBeNull();

      folderId = response.body.folder.id;
    });

    test("user cannot create two folders with the same name in the same parent folder", async () => {
      const response = await agent.post("/createFolder").send({
        newFolderName: "Documents",
        currentFolder: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can create a subfolder", async () => {
      const response = await agent.post("/createFolder").send({
        newFolderName: "Pictures",
        currentFolder: folderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.parentId).toBe(folderId);

      parentFolderId = folderId;
      folderId = response.body.folder.id;
    });
  });

  describe("Folder Rename", () => {
    test("user cannot rename a folder to blank", async () => {
      const response = await agent.post("/renameFolder").send({
        folderId,
        parentId: parentFolderId,
        updatedFolderName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can rename a folder", async () => {
      const response = await agent.post("/renameFolder").send({
        folderId,
        parentId: parentFolderId,
        updatedFolderName: "Photos",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.name).toBe("Photos");
    });

    test("user cannot rename a folder to the same name as existing folder in the same location", async () => {
      await agent.post("/createFolder").send({
        newFolderName: "Documents",
        currentFolder: parentFolderId,
      });
      const response = await agent.post("/renameFolder").send({
        folderId,
        parentId: parentFolderId,
        updatedFolderName: "Documents",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Folder Move", () => {
    test("user can move a folder", async () => {
      const response = await agent.post("/moveFolder").send({
        folderId,
        updatedParentId: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.parentId).toBeNull();
    });

    test("user can move folder back into parent", async () => {
      const response = await agent.post("/moveFolder").send({
        folderId,
        updatedParentId: parentFolderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.parentId).toBe(parentFolderId);
    });
    
    test("user can't move folder if folder of same name exists", async () => {
      await agent.post("/createFolder").send({
        newFolderName: "Photos",
        currentFolder: "",
      });

      const response = await agent.post("/moveFolder").send({
        folderId,
        updatedParentId: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Folder Reading", () => {
    test("user can open root folder", async () => {
      const response = await agent.get("/browser");

      expect(response.status).toBe(200);
    });

    test("user can open a folder", async () => {
      const response = await agent.get(`/browser/folder/${folderId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Folder Deletion", () => {
    test("user can delete a folder", async () => {
      const response = await agent.post("/deleteFolder").send({
        folderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder.id).toBe(folderId);
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

    const createResponse = await user1.post("/createFolder").send({
      newFolderName: "Secret Folder",
      currentFolder: "",
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
});

test("user cannot rename another user's folder", async () => {
  const user1 = request.agent(app);
  const user2 = request.agent(app);

  await user1.post("/register").type("form").send({
    username: "owner2",
    password: "supersecurepassword",
    confirmation: "supersecurepassword",
  });

  const createResponse = await user1.post("/createFolder").send({
    newFolderName: "Secret Folder",
    currentFolder: "",
  });

  const folderId = createResponse.body.folder.id;

  await user2.post("/register").type("form").send({
    username: "intruder2",
    password: "supersecurepassword",
    confirmation: "supersecurepassword",
  });

  const response = await user2.post("/renameFolder").send({
    folderId,
    updatedFolderName: "Hacked",
  });

  expect(response.status).toBe(404);
});

test("user cannot create a folder inside another user's folder", async () => {
  const user1 = request.agent(app);
  const user2 = request.agent(app);

  await user1.post("/register").type("form").send({
    username: "owner3",
    password: "supersecurepassword",
    confirmation: "supersecurepassword",
  });

  const createResponse = await user1.post("/createFolder").send({
    newFolderName: "Private Folder",
    currentFolder: "",
  });

  const folderId = createResponse.body.folder.id;

  await user2.post("/register").type("form").send({
    username: "intruder3",
    password: "supersecurepassword",
    confirmation: "supersecurepassword",
  });

  const response = await user2.post("/createFolder").send({
    newFolderName: "Hacked",
    currentFolder: folderId,
  });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
