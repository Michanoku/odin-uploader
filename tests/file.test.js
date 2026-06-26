import path from "path";
import request from "supertest";
import fs from "fs";
import app from "../app.js";


describe("File Operations", () => {
  const agent = request.agent(app);

  let fileId;
  let folderId;

  beforeAll(async () => {
    await agent.post("/register").type("form").send({
      username: "filetestuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const folderResponse = await agent.post("/createFolder").send({
      newFolderName: "Documents",
      currentFolder: "",
    });

    folderId = folderResponse.body.folder.id;
  });

  describe("File Upload", () => {
    test("user cannot upload without selecting a file", async () => {
      const response = await agent
        .post("/upload")
        .field("currentFolder", "");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe("Please select a file.");
    });

    test("user can upload a file to the root", async () => {
        const response = await agent
            .post("/upload")
            .field("currentFolder", "")
            .attach("file", path.resolve("tests/files/test.txt"));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.file.folderId).toBeNull();

        // Check that Multer created the file on disk
        const uploadedPath = path.resolve(
            "uploads",
            response.body.file.filename
        );

        expect(fs.existsSync(uploadedPath)).toBe(true);
        const stats = fs.statSync(uploadedPath);
        expect(stats.size).toBe(response.body.file.size);
        fileId = response.body.file.id;
    });

    test("user cannot upload duplicate filenames into the same folder", async () => {
      const response = await agent
        .post("/upload")
        .field("currentFolder", "")
        .attach("file", path.resolve("tests/files/test.txt"));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe(
        "File of the same name already exists in the folder."
      );
    });

    test("user can upload a file into a folder", async () => {
      const response = await agent
        .post("/upload")
        .field("currentFolder", folderId)
        .attach("file", path.resolve("tests/files/test.txt"));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(folderId);

      fileId = response.body.file.id;
    });
  });

  describe("File Rename", () => {
    test("user can rename a file", async () => {
      const response = await agent.post("/renameFile").send({
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
      const response = await agent.post("/moveFile").send({
        fileId,
        updatedFolderId: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBeNull();
    });

    test("user can move a file back into a folder", async () => {
      const response = await agent.post("/moveFile").send({
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
      const response = await agent.get(`/browser/file/${fileId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("File Deletion", () => {
    test("user can delete a file", async () => {
      const response = await agent.post("/deleteFile").send({
        fileId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.id).toBe(fileId);
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

    const uploadResponse = await user1
      .post("/upload")
      .field("currentFolder", "")
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

    const uploadResponse = await user1
      .post("/upload")
      .field("currentFolder", "")
      .attach("file", path.resolve("tests/files/test.txt"));

    const fileId = uploadResponse.body.file.id;

    await user2.post("/register").type("form").send({
      username: "intruderfile2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    const response = await user2.post("/renameFile").send({
      fileId,
      updatedFileName: "hacked.txt",
    });

    expect(response.status).toBe(404);
  });
});
