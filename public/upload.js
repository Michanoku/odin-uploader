const uploadForm = document.querySelector("#upload-form");
const fileInput = document.querySelector("#upload-files");
const modalOverlay = document.querySelector("#modal-overlay");
const newFolder = document.querySelector("#new-folder");
const newFolderForm = document.querySelector("#new-folder-form");
const loading = document.querySelector("#loading");
const closeModalButtons = document.querySelectorAll(
  "button[name='close-modal']"
);
const loadingMessage = document.querySelector("#loading-message");
const shareFolderForm = document.querySelector("#share-folder-form");
const shareFolderId = document.querySelector("#share-folder-id");
const shareFolder = document.querySelectorAll("button[name='share-folder']");
const renameFolderForm = document.querySelector("#rename-folder-form");
const renameFolderId = document.querySelector("#rename-folder-id");
const renameFolderName = document.querySelector("#rename-folder-name");
const renameFolder = document.querySelectorAll("button[name='rename-folder']");
const moveFolderId = document.querySelector("#move-folder-id");
const moveFolder = document.querySelectorAll("button[name='move-folder']");
const moveFolderForm = document.querySelector("#move-folder-form");
const confirmation = document.querySelector("#confirmation");
const confirmationMessage = document.querySelector("#confirmation-message");

fileInput.addEventListener("change", async () => {
  if (!fileInput.files.length) {
    return;
  }
  loadingMessage.textContent = "Uploading files...";
  modalOverlay.classList.remove("hidden");
  loading.classList.remove("hidden");

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
    closeModal();
  }
});

function createLink(href, text) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  return link;
}

function renderFolderContents(contents) {
  const container = document.querySelector(".folder-contents");

  container.replaceChildren();

  for (const folder of contents.folders) {
    container.appendChild(
      createLink(`/browser/folder/${folder.id}`, folder.name)
    );
  }

  for (const file of contents.files) {
    container.appendChild(
      createLink(`/browser/file/${file.id}`, file.originalname)
    );
  }
}

newFolder.addEventListener("click", async () => {
  modalOverlay.classList.remove("hidden");
  newFolderForm.classList.remove("hidden");
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    closeModal();
  });
});

shareFolderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(shareFolderForm);
  const body = new URLSearchParams(formData);
  try {
    const response = await fetch(shareFolderForm.action, {
      method: shareFolderForm.method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    });

    const result = await response.json();

    if (!result.success && result.errors?.length) {
      alert(result.errors.map((error) => error.msg).join("\n"));
      return;
    }

    shareFolderForm.classList.add("hidden");
    confirmationMessage.textContent = `Your shared folder link:\n${window.location.origin}/shared/folder/${result.folder.id}`
    confirmation.classList.remove("hidden");
  } catch (err) {
    console.log(err);
    closeModal();
  } 
});

newFolderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(newFolderForm);
  const body = new URLSearchParams(formData);
  try {
    const response = await fetch(newFolderForm.action, {
      method: newFolderForm.method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
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
    closeModal();
  }
});

renameFolderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(renameFolderForm);
  const body = new URLSearchParams(formData);
  try {
    const response = await fetch(renameFolderForm.action, {
      method: renameFolderForm.method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
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
    closeModal();
  }
});

shareFolder.forEach((button) => {
  button.addEventListener("click", () => {
    shareFolderId.value = button.dataset.id;
    modalOverlay.classList.remove("hidden");
    shareFolderForm.classList.remove("hidden");
  })
})

renameFolder.forEach((button) => {
  button.addEventListener("click", () => {
    renameFolderName.value = button.dataset.name;
    renameFolderId.value = button.dataset.id;
    modalOverlay.classList.remove("hidden");
    renameFolderForm.classList.remove("hidden");
  })
})

for (const button of moveFolder) {
  button.addEventListener("click", async () => {
    moveFolderId.value = button.dataset.id;
    const tree = await fetchTree("root");
    console.log(tree);
    modalOverlay.classList.remove("hidden");
    moveFolderForm.classList.remove("hidden");
  })
}

const closeModal = () => {
  loading.classList.add("hidden");
  newFolderForm.classList.add("hidden");
  modalOverlay.classList.add("hidden");
  renameFolderForm.classList.add("hidden");
  confirmation.classList.add("hidden");
}

const fetchTree = async (id) => {
  const body = new URLSearchParams();
  body.append("folderId", id);

  try {
    const response = await fetch("/getTree", {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    });

    const result = await response.json();

    if (!result.success && result.errors?.length) {
      alert(result.errors.map((error) => error.msg).join("\n"));
      return;
    }

    return result.tree;
  } catch (err) {
    console.log(err);
  }
};