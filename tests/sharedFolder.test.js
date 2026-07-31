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

describe("Shared Folder Access", () => {
  let owner;
  let guest;

  let rootId;
  let parentId;
  let sharedFolderId;
  let childId;
  let grandChildId;
  let privateFolderId;

  beforeEach(async () => {
    owner = request.agent(app);
    guest = request.agent(app);

    await prisma.share.deleteMany();
    await prisma.file.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.user.deleteMany();

    // Create owner and guest and all folders required and save their ids
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
      .send({ folderName: "SharedRoot" });

    rootId = rootFolder.body.folder.id;

    const parentFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ folderName: "Parent" });

    parentId = parentFolder.body.folder.id;

    const sharedFolder = await owner
      .post(`/browser/folder/${parentId}/createFolder`)
      .send({ folderName: "Shared Folder" });

    sharedFolderId = sharedFolder.body.folder.id;

    const childFolder = await owner
      .post(`/browser/folder/${sharedFolderId}/createFolder`)
      .send({ folderName: "Child" });

    childId = childFolder.body.folder.id;

    const grandChildFolder = await owner
      .post(`/browser/folder/${childId}/createFolder`)
      .send({ folderName: "Grand Child" });

    grandChildId = grandChildFolder.body.folder.id;

    const privateFolder = await owner
      .post(`/browser/folder/${rootId}/createFolder`)
      .send({ folderName: "Private Folder" });

    privateFolderId = privateFolder.body.folder.id;
  });

  test("cannot share with duration below minimum", async () => {
    // Attempt to share folder below minimum duration
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share with duration above maximum", async () => {
    // Attempt to share folder above maximum duration
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 31,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("cannot share with non-integer duration", async () => {
    // Attempt to share a folder with a duration of nuts, which is just bananas
    const response = await owner
      .post(`/browser/folder/${sharedFolderId}/shareFolder`)
      .send({
        folderId: childId,
        duration: "nuts",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("owner can share a folder", async () => {
    // Share a folder with allowed parameters
    const response = await owner
      .post(`/browser/folder/${parentId}/shareFolder`)
      .send({
        folderId: sharedFolderId,
        duration: 7,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  describe("after folder is shared", () => {
    test("guest can access shared folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Attempt to access the folder as a guest
      const response = await guest.get(`/shared/folder/${sharedFolderId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Shared Folder");
    });

    test("guest can access child folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Attempt to access child folder
      const response = await guest.get(`/shared/folder/${childId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Child");
    });

    test("guest can access grandchild folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Attempt to access grandchild folder
      const response = await guest.get(`/shared/folder/${grandChildId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Grand Child");
    });

    test("guest cannot access parent folder", async () => {
      // Attempt to access not shared parent folder
      const response = await guest.get(`/shared/folder/${parentId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot access root folder", async () => {
      // Attempt to access not shared root folder
      const response = await guest.get(`/shared/folder/${rootId}`);

      expect(response.status).toBe(404);
    });

    test("guest cannot access unrelated private folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Attempt to access an entirely different folder
      const response = await guest.get(`/shared/folder/${privateFolderId}`);

      expect(response.status).toBe(404);
    });

    test("guest can download shared folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Download the shared folder
      const download = await guest
        .post(`/shared/folder/${sharedFolderId}/downloadFolder`)
        .send({
          sharedTargetFolderId: childId,
        });

      expect(download.status).toBe(200);
      expect(download.headers["content-type"]).toMatch(/zip/);
      expect(download.headers["content-disposition"]).toContain(".zip");
    });

    test("cannot share child folder if a share already exists", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });

      const response = await owner
        .post(`/browser/folder/${sharedFolderId}/shareFolder`)
        .send({
          folderId: childId,
          duration: 7,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("parent folder can be shared as a separate share group", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });

      const response = await owner
        .post(`/browser/folder/${rootId}/shareFolder`)
        .send({
          folderId: parentId,
          duration: 7,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("new folder created inside shared folder is automatically shared", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      const newFolder = await owner
        .post(`/browser/folder/${sharedFolderId}/createFolder`)
        .send({
          folderName: "Future Shared Folder",
        });

      const newFolderId = newFolder.body.folder.id;

      expect(newFolder.status).toBe(200);
      expect(newFolder.body.folder.shareId).toBeTruthy();

      const response = await guest.get(`/shared/folder/${newFolderId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Future Shared Folder");
    });

    test("new file created inside shared folder is automatically shared", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      const upload = await owner
        .post(`/browser/folder/${sharedFolderId}/upload`)
        .attach(
          "file",
          path.resolve("tests/files/test.txt"),
          "future-file.txt"
        );

      const newFileId = upload.body.file.id;

      expect(upload.status).toBe(200);
      expect(upload.body.file.shareId).toBeTruthy();

      const response = await guest.get(`/shared/file/${newFileId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("future-file.txt");
    });

    test("cannot separately share file that is already part of a share", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      const upload = await owner
        .post(`/browser/folder/${sharedFolderId}/upload`)
        .attach(
          "file",
          path.resolve("tests/files/test.txt"),
          "already-shared.txt"
        );

      const fileId = upload.body.file.id;

      expect(upload.status).toBe(200);
      expect(upload.body.file.shareId).toBeTruthy();

      const response = await owner
        .post(`/browser/folder/${sharedFolderId}/shareFile`)
        .send({
          fileId,
          duration: 7,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    describe("when moving folders", () => {
      test("private folder moved into shared folder becomes shared", async () => {
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });
        const response = await owner
          .post(`/browser/folder/${parentId}/moveFolder`)
          .send({
            folderId: privateFolderId,
            parentId: sharedFolderId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.folder.shareId).toBeTruthy();

        const guestResponse = await guest.get(
          `/shared/folder/${privateFolderId}`
        );

        expect(guestResponse.status).toBe(200);
        expect(guestResponse.text).toContain("Private Folder");
      });

      test("shared child folder moved into private folder loses its share", async () => {
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });

        const response = await owner
          .post(`/browser/folder/${sharedFolderId}/moveFolder`)
          .send({
            folderId: childId,
            parentId: privateFolderId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.folder.shareId).toBeNull();

        const guestResponse = await guest.get(`/shared/folder/${childId}`);

        expect(guestResponse.status).toBe(404);
      });

      test("shared root folder moved into private folder keeps its share", async () => {
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });
        const response = await owner
          .post(`/browser/folder/${parentId}/moveFolder`)
          .send({
            folderId: sharedFolderId,
            parentId: privateFolderId,
          });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.folder.shareId).toBeTruthy();

        const guestResponse = await guest.get(
          `/shared/folder/${sharedFolderId}`
        );

        expect(guestResponse.status).toBe(200);
        expect(guestResponse.text).toContain("Shared Folder");
      });

      test("moving private folder into shared folder shares all descendants", async () => {
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });
        const subtree = await owner
          .post(`/browser/folder/${privateFolderId}/createFolder`)
          .send({
            folderName: "Subtree Root",
          });

        const subtreeId = subtree.body.folder.id;

        const child = await owner
          .post(`/browser/folder/${subtreeId}/createFolder`)
          .send({
            folderName: "Subtree Child",
          });

        const childFolderId = child.body.folder.id;

        const moveResponse = await owner
          .post(`/browser/folder/${privateFolderId}/moveFolder`)
          .send({
            folderId: subtreeId,
            parentId: sharedFolderId,
          });
        const guestResponse = await guest.get(
          `/shared/folder/${childFolderId}`
        );

        expect(guestResponse.status).toBe(200);
        expect(guestResponse.text).toContain("Subtree Child");
      });

      test("moving shared subtree into private folder unshares descendants", async () => {
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });
        const response = await owner
          .post(`/browser/folder/${sharedFolderId}/moveFolder`)
          .send({
            folderId: childId,
            parentId: privateFolderId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const guestShared = await guest.get(`/shared/folder/${sharedFolderId}`);
        const guestChild = await guest.get(`/shared/folder/${childId}`);
        const guestGrandChild = await guest.get(
          `/shared/folder/${grandChildId}`
        );

        expect(guestShared.status).toBe(200);
        expect(guestChild.status).toBe(404);
        expect(guestGrandChild.status).toBe(404);
      });
      
      test("shared root moved into another shared folder joins target share and deletes old share", async () => {
        // Share the first folder
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });

        // Create and share another folder
        const secondFolder = await owner
          .post(`/browser/folder/${parentId}/createFolder`)
          .send({
            folderName: "Second Shared Folder",
          });

        const secondFolderId = secondFolder.body.folder.id;

        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: secondFolderId,
          duration: 7,
        });

        const sourceFolder = await prisma.folder.findUnique({
          where: { id: sharedFolderId },
          include: { rootShare: true },
        });

        const targetFolder = await prisma.folder.findUnique({
          where: { id: secondFolderId },
        });

        const oldShareId = sourceFolder.shareId;
        const newShareId = targetFolder.shareId;

        const response = await owner
          .post(`/browser/folder/${parentId}/moveFolder`)
          .send({
            folderId: sharedFolderId,
            parentId: secondFolderId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.folder.shareId).toBe(newShareId);
        expect(response.body.folder.shareId).not.toBe(oldShareId);

        const deletedShare = await prisma.share.findUnique({
          where: { id: oldShareId },
        });

        expect(deletedShare).toBeNull();
      });

      test("shared child moved into another shared folder joins target share but keeps original share", async () => {
        // Share the first folder
        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: sharedFolderId,
          duration: 7,
        });

        // Create and share another folder
        const secondFolder = await owner
          .post(`/browser/folder/${parentId}/createFolder`)
          .send({
            folderName: "Second Shared Folder",
          });

        const secondFolderId = secondFolder.body.folder.id;

        await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
          folderId: secondFolderId,
          duration: 7,
        });

        const childBefore = await prisma.folder.findUnique({
          where: { id: childId },
        });

        const targetFolder = await prisma.folder.findUnique({
          where: { id: secondFolderId },
        });

        const originalShareId = childBefore.shareId;
        const targetShareId = targetFolder.shareId;

        const response = await owner
          .post(`/browser/folder/${sharedFolderId}/moveFolder`)
          .send({
            folderId: childId,
            parentId: secondFolderId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.folder.shareId).toBe(targetShareId);
        expect(response.body.folder.shareId).not.toBe(originalShareId);

        const originalShare = await prisma.share.findUnique({
          where: { id: originalShareId },
        });

        expect(originalShare).toBeTruthy();
      });
    });

    test("owner can unshare folder", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      // Unshare the folder
      const response = await owner
        .post(`/browser/folder/${parentId}/unshareFolder`)
        .send({
          folderId: sharedFolderId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("guest loses access after folder is unshared", async () => {
      await owner.post(`/browser/folder/${parentId}/shareFolder`).send({
        folderId: sharedFolderId,
        duration: 7,
      });
      await owner.post(`/browser/folder/${parentId}/unshareFolder`).send({
        folderId: sharedFolderId,
      });
      // Attempt to access the unshared folder
      const response = await guest.get(`/shared/folder/${sharedFolderId}`);

      expect(response.status).toBe(404);
    });
  });
});
