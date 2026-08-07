import path from "path";

import request from "supertest";

import app from "../app.js";
import "../config/env.js";
import { prisma } from "../lib/prisma.js";

// Get the path and parent id of the users root.
async function getRootPathAndId(agent) {
  const response = await agent.get("/");
  const parentId = response.headers.location.split("/").pop();
  return { path: response.headers.location, id: parentId };
}

describe("Shared File Access", () => {
  let owner;
  let guest;

  let folderId;
  let fileId;
  let root;

  beforeEach(async () => {
    await prisma.share.deleteMany();
    await prisma.file.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.user.deleteMany();

    owner = request.agent(app);
    guest = request.agent(app);

    // Register two users, one for sharing and one for accessing
    await owner.post("/register").type("form").send({
      email: "sharedFileOwner@example.com",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });

    await guest.post("/register").type("form").send({
      email: "sharedFileGuest@example.com",
      password: "supersecurepassword",
      confirmation: "supersecurepassword",
    });
    root = await getRootPathAndId(owner);

    // Create a folder and upload file to it, save the ids
    const folder = await owner.post(`${root.path}/createFolder`).send({
      folderName: "Documents",
    });
    folderId = folder.body.folder.id;
    const upload = await owner
      .post(`/browser/folder/${folderId}/upload`)
      .attach("file", path.resolve("tests/files/test.txt"), "upload.txt");
    fileId = upload.body.file.id;
  });

  test("cannot share file with duration below minimum", async () => {
    // Attempt to share the file without a duration
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share file with duration above maximum", async () => {
    // Attempt to share the file with the maximum duration exceeded
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 31,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share file with non-integer duration", async () => {
    // Attempt to share file with a duration of bananas, which is nuts, even though a banana is a fruit
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: "banana",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("owner can share file", async () => {
    // Share the file with valid parameters
    const response = await owner
      .post(`/browser/folder/${folderId}/shareFile`)
      .send({
        fileId,
        duration: 7,
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  describe("after file is shared", () => {
    test("guest can view shared file", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFile`).send({
        fileId,
        duration: 7,
      });
      // Attempt to access the file as a guest
      const response = await guest.get(`/shared/file/${fileId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("upload.txt");
    });

    test("guest can download shared file", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFile`).send({
        fileId,
        duration: 7,
      });
      // Attempt to download the file as a guest
      const response = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("upload.txt");
    });

    test("owner can unshare file", async () => {
      // Unshare the file
      const response = await owner
        .post(`/browser/folder/${folderId}/unshareFile`)
        .send({
          fileId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("guest loses access after file is unshared", async () => {
      // Try to access the file again after it has been unshared
      const response = await guest.get(`/shared/file/${fileId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot download file after it is unshared", async () => {
      // Try to download the file after it has been unshared
      const response = await guest
        .post(`/shared/file/${fileId}/downloadFile`)
        .send({ sharedFileId: fileId });

      expect(response.status).toBe(404);
    });
  });

  describe("when moving files", () => {
    test("private file moved into shared folder becomes shared", async () => {
      const folder = await owner.post(`${root.path}/createFolder`).send({
        folderName: "SecondFolder",
      });
      const secondFolderId = folder.body.folder.id;

      const shareResponse = await owner.post(`${root.path}/shareFolder`).send({
        folderId: secondFolderId,
        duration: 7,
      });

      const privateFolder = await owner.post(`${root.path}/createFolder`).send({
        folderName: "Private Folder",
      });

      const privateFolderId = privateFolder.body.folder.id;

      const upload = await owner
        .post(`/browser/folder/${privateFolderId}/upload`)
        .attach("file", path.resolve("tests/files/test.txt"), "private.txt");

      const privateFileId = upload.body.file.id;

      const response = await owner
        .post(`/browser/folder/${privateFolderId}/moveFile`)
        .send({
          fileId: privateFileId,
          folderId: secondFolderId,
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.shareId).toBeTruthy();

      const guestResponse = await guest.get(`/shared/file/${privateFileId}`);

      expect(guestResponse.status).toBe(200);
      expect(guestResponse.text).toContain("private.txt");
    });

    test("shared root file moved into private folder keeps its share", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFile`).send({
        fileId,
        duration: 7,
      });

      const privateFolder = await owner.post(`${root.path}/createFolder`).send({
        folderName: "Private Folder",
      });

      const privateFolderId = privateFolder.body.folder.id;

      const originalShareId = (
        await prisma.file.findUnique({
          where: { id: fileId },
        })
      ).shareId;

      const response = await owner
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          folderId: privateFolderId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.shareId).toBe(originalShareId);
    });

    test("shared non-root file moved into private folder loses its share", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFolder`).send({
        folderId,
        duration: 7,
      });

      const parent = await owner
        .post(`${root.path}/createFolder`)
        .send({ folderName: "Private Folder" });
      const parentId = parent.body.folder.id;

      const response = await owner
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          folderId: parentId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.shareId).toBeNull();

      const guestResponse = await guest.get(`/shared/file/${fileId}`);

      expect(guestResponse.status).toBe(404);
    });

    test("shared root file moved into another shared folder joins destination share and deletes old share", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFile`).send({
        fileId,
        duration: 7,
      });

      const destination = await owner
        .post(`/browser/folder/${folderId}/createFolder`)
        .send({
          folderName: "Destination",
        });

      const destinationId = destination.body.folder.id;

      await owner.post(`/browser/folder/${folderId}/shareFolder`).send({
        folderId: destinationId,
        duration: 7,
      });

      const originalShareId = (
        await prisma.file.findUnique({
          where: { id: fileId },
        })
      ).shareId;

      const destinationShareId = (
        await prisma.folder.findUnique({
          where: { id: destinationId },
        })
      ).shareId;

      const response = await owner
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          folderId: destinationId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.shareId).toBe(destinationShareId);
      expect(response.body.file.shareId).not.toBe(originalShareId);

      const deletedShare = await prisma.share.findUnique({
        where: { id: originalShareId },
      });

      expect(deletedShare).toBeNull();
    });

    test("shared non-root file moved into another shared folder joins destination share and keeps original share", async () => {
      await owner.post(`/browser/folder/${folderId}/shareFolder`).send({
        folderId,
        duration: 7,
      });

      const sourceShareId = (
        await prisma.file.findUnique({
          where: { id: fileId },
        })
      ).shareId;

      const destination = await owner.post(`${root.path}/createFolder`).send({
        folderName: "Destination",
      });

      const destinationId = destination.body.folder.id;

      await owner.post(`${root.path}/shareFolder`).send({
        folderId: destinationId,
        duration: 7,
      });

      const destinationShareId = (
        await prisma.folder.findUnique({
          where: { id: destinationId },
        })
      ).shareId;

      const response = await owner
        .post(`/browser/folder/${folderId}/moveFile`)
        .send({
          fileId,
          folderId: destinationId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.shareId).toBe(destinationShareId);
      expect(response.body.file.shareId).not.toBe(sourceShareId);

      const share = await prisma.share.findUnique({
        where: { id: sourceShareId },
      });

      expect(share).toBeTruthy();
    });
  });
});
