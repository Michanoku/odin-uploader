import path from "path";
import request from "supertest";
import fs from "fs";
import app from "../app.js";

async function getRootPathAndId(agent) {
  const response = await agent.get("/browser");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("File Operations", () => {
  const agent = request.agent(app);


  beforeAll(async () => {
    await agent.post("/register").type("form").send({
      username: "filetestuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
  });

  describe("File Upload", () => {
    test("user cannot upload without selecting a file", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent.post(`${root.path}/upload`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe("Please select a file.");
    });

    test("user can upload a file to the root", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check that Multer created the file on disk
      const uploadedPath = path.resolve("uploads", response.body.file.filename);

      expect(fs.existsSync(uploadedPath)).toBe(true);
      const stats = fs.statSync(uploadedPath);
      expect(stats.size).toBe(response.body.file.size);
      fileId = response.body.file.id;
    });

    test("user cannot upload duplicate filenames into the same folder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe(
        "File of the same name already exists in the folder."
      );
    });

    test("user can upload a file into a folder", async () => {
      const root = await getRootPathAndId(agent);   
      const createResponse = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "Documents",
      });

      const folderId = createResponse.body.folder.id;
      const response = await agent
        .post(`/browser/folder/${folderId}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(folderId);
    });
  });

  describe("File Rename", () => {
    test("user can rename a file", async () => {
      const root = await getRootPathAndId(agent);   
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test2.txt"));

      const fileId = uploadResponse.body.file.id;
      const response = await agent.post(`${root.path}/renameFile`).send({
        fileId,
        updatedFileName: "renamed.txt",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.originalname).toBe("renamed.txt");
    });
  });

  describe("File Move", () => {
    test("user can move a file to the root", async () => {
      const root = await getRootPathAndId(agent);   
      const createResponse = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "NotRoot",
      });
      const folderId = createResponse.body.folder.id;
      const uploadResponse = await agent
        .post(`/browser/folder/${folderId}/upload`)
        .attach("file", path.resolve("tests/files/test3.txt"));

      const fileId = uploadResponse.body.file.id;
      const response = await agent.post(`/browser/folder/${folderId}/moveFile`).send({
        fileId,
        updatedFolderId: root.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(root.id);
    });

    test("user can move a file into a folder", async () => {
      const root = await getRootPathAndId(agent);
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test4.txt"));

      const fileId = uploadResponse.body.file.id;
      const createResponse = await agent.post(`${root.path}/createFolder`).send({
        newFolderName: "NotRoot2",
      });
      const folderId = createResponse.body.folder.id;
      const response = await agent.post(`${root.path}/moveFile`).send({
        fileId,
        updatedFolderId: folderId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(folderId);
    });
  });

  describe("File Reading", () => {
    test("user can open a file", async () => {
      const root = await getRootPathAndId(agent);
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test5.txt"));
      const fileId = uploadResponse.body.file.id;
      const response = await agent.get(`/browser/file/${fileId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("File Deletion", () => {
    test("user can delete a file", async () => {
      const root = await getRootPathAndId(agent);
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test6.txt"));
      const fileId = uploadResponse.body.file.id;
      const response = await agent.post(`${root.path}/deleteFile`).send({
        fileId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.id).toBe(fileId);

      // Verify the file was deleted
      const uploadedPath = path.resolve("uploads", response.body.file.filename);

      expect(fs.existsSync(uploadedPath)).toBe(false);
    });
  });
});

describe("File Ownership", () => {
  test("user cannot access another user's file", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    await user1.post("/register").type("form").send({
      username: "ownerfile",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root1 = await getRootPathAndId(user1);
    const uploadResponse = await user1
      .post(`${root1.path}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"));

    const fileId = uploadResponse.body.file.id;

    await user2.post("/register").type("form").send({
      username: "intruderfile",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const response = await user2.get(`/browser/file/${fileId}`);

    expect(response.status).toBe(404);
  });

  test("user cannot rename another user's file", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    await user1.post("/register").type("form").send({
      username: "ownerfile2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root1 = await getRootPathAndId(user1);
    const uploadResponse = await user1
      .post(`${root1.path}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"));

    const fileId = uploadResponse.body.file.id;

    await user2.post("/register").type("form").send({
      username: "intruderfile2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root2 = await getRootPathAndId(user2);
    const response = await user2.post(`${root2.path}/renameFile`).send({
      fileId,
      updatedFileName: "hacked.txt",
    });

    expect(response.status).toBe(404);
  });
});

describe("Recursive Folder Deletion", () => {
  test("deleting a folder deletes all nested folders and uploaded files", async () => {
    const agent = request.agent(app);

    // Register user
    await agent.post("/register").type("form").send({
      username: "recursiveuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const root = await getRootPathAndId(agent);
    // Root folder
    const rootFolder = await agent.post(`${root.path}/createFolder`).send({
      newFolderName: "Root",
    });

    const rootId = rootFolder.body.folder.id;

    // Child folder
    const child = await agent.post(`/browser/folder/${rootId}/createFolder`).send({
      newFolderName: "Child",
    });

    const childId = child.body.folder.id;

    // Grandchild folder
    const grandchild = await agent.post(`/browser/folder/${childId}/createFolder`).send({
      newFolderName: "Grandchild",
    });

    const grandChildId = grandchild.body.folder.id;

    // Upload to grandchild folder
    const upload = await agent
      .post(`/browser/folder/${grandChildId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"));

    expect(upload.status).toBe(200);

    const filename = upload.body.file.filename;
    const uploadedPath = path.resolve("uploads", filename);

    // Verify file on disk
    expect(fs.existsSync(uploadedPath)).toBe(true);

    // Delete root folder
    const deletion = await agent.post(`${root.path}/deleteFolder`).send({
      folderId: rootId,
    });

    expect(deletion.status).toBe(200);
    expect(deletion.body.success).toBe(true);

    // Verify file was deleted
    expect(fs.existsSync(uploadedPath)).toBe(false);

    // Root folder no longer exists
    const rootResponse = await agent.get(`/browser/folder/${rootId}`);
    expect(rootResponse.status).toBe(404);

    // Child folder no longer exists
    const childResponse = await agent.get(`/browser/folder/${childId}`);
    expect(childResponse.status).toBe(404);

    // Grandchild folder no longer exists
    const grandchildResponse = await agent.get(`/browser/folder/${grandChildId}`);
    expect(grandchildResponse.status).toBe(404);

    // File record no longer exists
    const fileResponse = await agent.get(`/browser/file/${upload.body.file.id}`);
    expect(fileResponse.status).toBe(404);
  });
});