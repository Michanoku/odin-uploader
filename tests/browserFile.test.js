import fs from "fs";
import path from "path";

import request from "supertest";

import app from "../app.js";

// Get the path and parent id of the users root.
async function getRootPathAndId(agent) {
  const response = await agent.get("/");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("File Operations", () => {
  const agent = request.agent(app);

  // Register a user to use
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
        .attach("file", path.resolve("tests/files/test.txt"), "upload1.txt");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check that Multer created the file on disk
      const uploadedPath = path.resolve("uploads/test", response.body.file.filename);

      expect(fs.existsSync(uploadedPath)).toBe(true);
      const stats = fs.statSync(uploadedPath);
      expect(stats.size).toBe(response.body.file.size);
      fileId = response.body.file.id;
    });

    test("user cannot upload duplicate filenames into the same folder", async () => {
      const root = await getRootPathAndId(agent);
      const response = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "upload1.txt");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe(
        "File of the same name already exists in the folder."
      );
    });

    test("user can upload a file into a folder", async () => {
      const root = await getRootPathAndId(agent);
      // Create a folder and get the Id to use for file upload
      const createResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          folderName: "Documents",
        });
      const folderId = createResponse.body.folder.id;

      // Upload the file
      const response = await agent
        .post(`/browser/folder/${folderId}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "upload3.txt");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(folderId);
    });
  });

  describe("File Rename", () => {
    test("user can rename a file", async () => {
      const root = await getRootPathAndId(agent);

      // Upload a file to rename later and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "rename1.txt");
      const fileId = uploadResponse.body.file.id;

      // Rename the file
      const response = await agent.post(`${root.path}/renameFile`).send({
        fileId,
        updatedFileName: "renamed.txt",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.originalname).toBe("renamed.txt");
    });

    test("user cannot rename a file to the same name of another file", async () => {
      const root = await getRootPathAndId(agent);

      // Upload another file and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "rename2.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to rename to the same name as previous file
      const response = await agent.post(`${root.path}/renameFile`).send({
        fileId,
        updatedFileName: "renamed.txt",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("File Move", () => {
    test("user can't move a file to nowhere", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder and get the id from it, then upload a file to that folder and get its id
      const createResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          folderName: "NotRoot",
        });
      const folderId = createResponse.body.folder.id;
      const uploadResponse = await agent
        .post(`/browser/folder/${folderId}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "move1.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to move the file without presenting a target ID
      const response = await agent
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          updatedFolderId: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("user can move a file to the root", async () => {
      const root = await getRootPathAndId(agent);

      // Create a folder, get the id, and upload a file to the folder and get its id
      const createResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          folderName: "NotRoot2",
        });
      const folderId = createResponse.body.folder.id;
      const uploadResponse = await agent
        .post(`/browser/folder/${folderId}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "move2.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to move that folder into the root
      const response = await agent
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          updatedFolderId: root.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.folderId).toBe(root.id);
    });

    test("user can move a file into a folder", async () => {
      const root = await getRootPathAndId(agent);

      // Upload a file to the root and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "move3.txt");
      const fileId = uploadResponse.body.file.id;

      // Create a folder for the file to move to and get the id
      const createResponse = await agent
        .post(`${root.path}/createFolder`)
        .send({
          folderName: "NotRoot3",
        });
      const folderId = createResponse.body.folder.id;

      // Try to move the file into the folder
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

      // Upload a file to read and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "open1.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to read the file
      const response = await agent.get(`/browser/file/${fileId}`);

      expect(response.status).toBe(200);
    });
  });

  describe("File Deletion", () => {
    test("user can delete a file", async () => {
      const root = await getRootPathAndId(agent);

      // Upload a file to delete later and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "delete1.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to delete the file
      const response = await agent.post(`${root.path}/deleteFile`).send({
        fileId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.id).toBe(fileId);

      // See if the file was deleted
      const uploadedPath = path.resolve("uploads/test", response.body.file.filename);

      expect(fs.existsSync(uploadedPath)).toBe(false);
    });
  });
  describe("File Download", () => {
    test("user can download a file", async () => {
      const root = await getRootPathAndId(agent);

      // Upload a file and get the id
      const uploadResponse = await agent
        .post(`${root.path}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "download1.txt");
      const fileId = uploadResponse.body.file.id;

      // Try to download the file
      const download = await agent
        .post(`${root.path}/downloadFile`)
        .send({
          fileId,
        })
        .buffer(true)
        .parse((res, callback) => {
          const chunks = [];

          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        });

      expect(download.status).toBe(200);
      expect(download.headers["content-disposition"]).toContain(
        "download1.txt"
      );

      const original = fs.readFileSync(path.resolve("tests/files/test.txt"));

      expect(download.body.equals(original)).toBe(true);
    });
  });
});

describe("File Ownership", () => {
  test("user cannot access another user's file", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    // Register a new user and upload the file we want to check later, get its id
    await user1.post("/register").type("form").send({
      username: "ownerfile",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root1 = await getRootPathAndId(user1);
    const uploadResponse = await user1
      .post(`${root1.path}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "access1.txt");
    const fileId = uploadResponse.body.file.id;

    // Register the second user to try to access the file
    await user2.post("/register").type("form").send({
      username: "intruderfile",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    // Try to access the file
    const response = await user2.get(`/browser/file/${fileId}`);

    expect(response.status).toBe(404);
  });

  test("user cannot rename another user's file", async () => {
    const user1 = request.agent(app);
    const user2 = request.agent(app);

    // Register a new user and upload a file for the second user to try to rename, get its id
    await user1.post("/register").type("form").send({
      username: "ownerfile2",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root1 = await getRootPathAndId(user1);
    const uploadResponse = await user1
      .post(`${root1.path}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "access2.txt");
    const fileId = uploadResponse.body.file.id;

    // Register the second user and try to rename the file from their own root with malicious id
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

    // Register user, and create a bunch of nested folders and files
    await agent.post("/register").type("form").send({
      username: "recursiveuser",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    const root = await getRootPathAndId(agent);

    // Root folder
    const rootFolder = await agent.post(`${root.path}/createFolder`).send({
      folderName: "Root",
    });
    const rootId = rootFolder.body.folder.id;

    // Child folder
    const child = await agent
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({
        folderName: "Child",
      });
    const childId = child.body.folder.id;

    // Grandchild folder
    const grandchild = await agent
      .post(`/browser/folder/${childId}/createFolder`)
      .send({
        folderName: "Grandchild",
      });
    const grandChildId = grandchild.body.folder.id;

    // Upload file to grandchild folder
    const upload = await agent
      .post(`/browser/folder/${grandChildId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "recursion.txt");

    // Sanity check but it should work
    expect(upload.status).toBe(200);

    const filename = upload.body.file.filename;
    const uploadedPath = path.resolve("uploads/test", filename);

    // Verify the files are there
    expect(fs.existsSync(uploadedPath)).toBe(true);

    // Delete the root folder
    const deletion = await agent.post(`${root.path}/deleteFolder`).send({
      folderId: rootId,
    });

    // Sanity check to see if deletion goes through
    expect(deletion.status).toBe(200);
    expect(deletion.body.success).toBe(true);

    // Verify file was deleted
    expect(fs.existsSync(uploadedPath)).toBe(false);

    // Check all folders to see if they have been deleted
    const rootResponse = await agent.get(`/browser/folder/${rootId}`);
    expect(rootResponse.status).toBe(404);
    const childResponse = await agent.get(`/browser/folder/${childId}`);
    expect(childResponse.status).toBe(404);
    const grandchildResponse = await agent.get(
      `/browser/folder/${grandChildId}`
    );
    expect(grandchildResponse.status).toBe(404);

    // Check if the file can be accessed
    const fileResponse = await agent.get(
      `/browser/file/${upload.body.file.id}`
    );
    expect(fileResponse.status).toBe(404);
  });
});
