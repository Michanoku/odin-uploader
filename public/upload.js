import { modalHandler } from "./modal.js";

const uploadForm = document.querySelector("#upload-form");
const fileInput = document.querySelector("#upload-files");
const newFolderButton = document.querySelector("#new-folder");

fileInput.addEventListener("change", async () => {
  if (!fileInput.files.length) {
    return;
  }
  modalHandler.loading("Uploading files...");

  const formData = new FormData(uploadForm);

  try {
    const response = await fetch(uploadForm.action, {
      method: uploadForm.method,
      body: formData,
    });

    const result = await response.json();

    if (!result.success && result.errors?.length) {
      alert(result.errors.map((error) => error.msg).join("\n"));
      return;
    }

    renderFolderContents(result.folderContents);
  } catch (err) {
    console.log(err);
  } finally {
    modalHandler.closeModal();
  }
});

function renderFolderContents(contents) {
  const container = document.querySelector(".folder-contents");
  container.innerHTML = contents;
  addEventListeners();
}

const addEventListeners = () => {
  const shareFolder = document.querySelectorAll("button[name='share-folder']");
  const renameFolder = document.querySelectorAll(
    "button[name='rename-folder']"
  );
  const moveFolder = document.querySelectorAll("button[name='move-folder']");
  const deleteFolder = document.querySelectorAll(
    "button[name='delete-folder']"
  );
  const shareFile = document.querySelectorAll("button[name='share-file']");
  const renameFile = document.querySelectorAll("button[name='rename-file']");
  const moveFile = document.querySelectorAll("button[name='move-file']");
  const deleteFile = document.querySelectorAll("button[name='delete-file']");

  shareFolder.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.share === "true") {
        modalHandler.unshareFolder(button.dataset.id);
      } else {
        modalHandler.shareFolder(button.dataset.id);
      }
    });
  });

  renameFolder.forEach((button) => {
    button.addEventListener("click", () => {
      modalHandler.renameFolder(button.dataset.id, button.dataset.name);
    });
  });

  deleteFolder.forEach((button) => {
    button.addEventListener("click", () => {
      modalHandler.deleteFolder(button.dataset.id);
    });
  });

  for (const button of moveFolder) {
    button.addEventListener("click", async () => {
      await modalHandler.moveFolder(button.dataset.id);
    });
  }

  shareFile.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.share === "true") {
        modalHandler.unshareFile(button.dataset.id);
      } else {
        modalHandler.shareFile(button.dataset.id);
      }
    });
  });

  renameFile.forEach((button) => {
    button.addEventListener("click", () => {
      modalHandler.renameFile(button.dataset.id, button.dataset.name);
    });
  });

  deleteFile.forEach((button) => {
    button.addEventListener("click", () => {
      modalHandler.deleteFile(button.dataset.id);
    });
  });

  for (const button of moveFile) {
    button.addEventListener("click", async () => {
      await modalHandler.moveFile(button.dataset.id);
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  newFolderButton.addEventListener("click", async () => {
    modalHandler.newFolder();
  });
  addEventListeners();
});
