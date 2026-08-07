const modalHandler = (() => {
  const elements = {
    modalOverlay: document.querySelector("#modal-overlay"),
    modalSpinner: document.querySelector("#modal-spinner"),
    modalMessage: document.querySelector("#modal-message"),
    modalForm: document.querySelector("#modal-form"),
    folderId: document.querySelector("#folder-id"),
    fileId: document.querySelector("#file-id"),
    parentId: document.querySelector("#parent-id"),
    treeList: document.querySelector("#tree-list"),
    nameField: document.querySelector("#name-field"),
    nameFieldLabel: document.querySelector("#name-field-label"),
    nameFieldInput: document.querySelector("#name-field-input"),
    durationField: document.querySelector("#duration-field"),
    durationFieldInput: document.querySelector("#duration-field-input"),
    modalAction: document.querySelector("#modal-action"),
    modalClose: document.querySelector("#modal-close"),
  };

  const currentFolderId = elements.modalOverlay.dataset.currentFolderId;

  const closeModal = () => {
    elements.modalSpinner.style.display = "none";
    elements.modalMessage.style.display = "none";
    elements.modalForm.style.display = "none";
    elements.treeList.style.display = "none";
    elements.nameField.style.display = "none";
    elements.durationField.style.display = "none";
    elements.modalAction.style.display = "none";
    elements.modalClose.style.display = "none";
    // disable folder id and parent id, and inputs
    elements.folderId.disabled = true;
    elements.fileId.disabled = true;
    elements.parentId.disabled = true;
    elements.nameFieldInput.disabled = true;
    elements.durationFieldInput.disabled = true;
    elements.modalForm.setAttribute("action", "");
    elements.modalAction.textContent = "";
    elements.nameFieldLabel.textContent = "";
    elements.nameFieldInput.value = "";
    elements.nameFieldInput.name = "";
    elements.durationFieldInput.value = "1";
    elements.modalMessage.textContent = "";
    elements.modalOverlay.classList.add("hidden");
  };

  const openModal = async (options) => {
    closeModal();
    for (const option of options.show) {
      elements[option].style.display = elements[option].dataset.style;
    }
    if (options.message) {
      elements.modalMessage.textContent = options.message;
    }
    if (options.enable) {
      for (const option of options.enable) {
        elements[option].disabled = false;
      }
    }
    if (options.action) {
      elements.modalForm.setAttribute("action", options.action);
    }
    if (options.button) {
      elements.modalAction.textContent = options.button;
    }
    if (options.fileId) {
      elements.fileId.value = options.fileId;
    }
    if (options.folderId) {
      elements.folderId.value = options.folderId;
    }
    if (options.parentId) {
      elements.parentId.value = options.parentId;
      await updateTree("Root", "root", options.folderId);
    }
    if (options.name) {
      elements.nameFieldInput.value = options.name;
    }

    if (options.nameFieldLabel) {
      elements.nameFieldLabel.textContent = options.nameFieldLabel;
    }

    if (options.nameFieldInput) {
      elements.nameFieldInput.name = options.nameFieldInput;
    }

    elements.modalOverlay.classList.remove("hidden");
  };

  const fetchTree = async (id, targetFolderId) => {
    const body = new URLSearchParams();
    body.append("folderId", id);
    body.append("targetFolderId", targetFolderId);
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

  const updateTree = async (name, parent, target) => {
    elements.modalMessage.textContent = name;
    const tree = await fetchTree(parent, target);
    while (elements.treeList.firstChild) {
      elements.treeList.removeChild(elements.treeList.firstChild);
    }
    if (!tree) return;
    tree.forEach((folder) => {
      const link = createFolderDiv(folder, target);
      elements.treeList.appendChild(link);
    });
  };

  const createFolderDiv = (folder, targetFolderId) => {
    const link = document.createElement("a");
    link.dataset.id = folder.id;
    link.dataset.name = folder.name;
    const SVG_NS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(SVG_NS, "svg");
    const use = document.createElementNS(SVG_NS, "use");
    svg.classList.add("folder-icon");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    use.setAttribute("href", "#icon-folder");
    const div = document.createElement("div");
    div.classList.add("folder-name");
    div.textContent = folder.name;
    svg.appendChild(use);
    link.appendChild(svg);
    link.appendChild(div);
    link.addEventListener("click", async () => {
      elements.parentId.value = folder.id;
      await updateTree(folder.name, folder.id, targetFolderId);
    });
    return link;
  };

  const loading = (message) => {
    const options = {
      show: ["modalSpinner", "modalMessage"],
      message: message,
    };
    return openModal(options);
  };

  const confirmation = (message) => {
    const options = {
      show: ["modalMessage", "modalClose"],
      message: message,
    };
    return openModal(options);
  };

  const newFolder = () => {
    const options = {
      show: ["modalForm", "nameField", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/createFolder`,
      enable: ["nameFieldInput"],
      button: "Create",
      nameFieldLabel: "Folder name",
      nameFieldInput: "folderName",
    };
    return openModal(options);
  };

  const renameFolder = (folderId, folderName) => {
    const options = {
      show: ["modalForm", "nameField", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/renameFolder`,
      enable: ["nameFieldInput", "folderId"],
      button: "Rename",
      nameFieldLabel: "Folder name",
      nameFieldInput: "folderName",
      folderId: folderId,
      name: folderName,
    };
    return openModal(options);
  };

  const shareFolder = (folderId) => {
    const options = {
      show: ["modalForm", "durationField", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/shareFolder`,
      enable: ["durationFieldInput", "folderId"],
      button: "Share",
      folderId: folderId,
    };
    return openModal(options);
  };

  const unshareFolder = (folderId) => {
    const options = {
      show: ["modalForm", "modalMessage", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/unshareFolder`,
      enable: ["folderId"],
      button: "Unshare",
      message: "Stop sharing this folder?",
      folderId: folderId,
    };
    return openModal(options);
  };

  const moveFolder = async (folderId) => {
    const options = {
      show: [
        "modalForm",
        "modalMessage",
        "modalAction",
        "modalClose",
        "treeList",
      ],
      action: `/browser/folder/${currentFolderId}/moveFolder`,
      enable: ["parentId", "folderId"],
      button: "Move",
      folderId: folderId,
      parentId: currentFolderId,
    };
    return await openModal(options);
  };

  const deleteFolder = (folderId) => {
    const options = {
      show: ["modalForm", "modalAction", "modalClose", "modalMessage"],
      action: `/browser/folder/${currentFolderId}/deleteFolder`,
      enable: ["folderId"],
      button: "Delete",
      folderId: folderId,
      message: "Delete this folder?",
    };
    return openModal(options);
  };

  const renameFile = (fileId, fileName) => {
    const options = {
      show: ["modalForm", "nameField", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/renameFile`,
      enable: ["nameFieldInput", "fileId"],
      button: "Rename",
      nameFieldLabel: "File name",
      nameFieldInput: "fileName",
      fileId: fileId,
      name: fileName,
    };
    return openModal(options);
  };

  const unshareFile = (fileId) => {
    const options = {
      show: ["modalForm", "modalMessage", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/unshareFile`,
      enable: ["fileId"],
      button: "Unshare",
      message: "Stop sharing this file?",
      fileId: fileId,
    };
    return openModal(options);
  };

  const shareFile = (fileId) => {
    const options = {
      show: ["modalForm", "durationField", "modalAction", "modalClose"],
      action: `/browser/folder/${currentFolderId}/shareFile`,
      enable: ["durationFieldInput", "fileId"],
      button: "Share",
      fileId: fileId,
    };
    return openModal(options);
  };

  const moveFile = async (fileId) => {
    const options = {
      show: [
        "modalForm",
        "modalMessage",
        "modalAction",
        "modalClose",
        "treeList",
      ],
      action: `/browser/folder/${currentFolderId}/moveFile`,
      enable: ["parentId", "fileId"],
      button: "Move",
      fileId: fileId,
      parentId: currentFolderId,
    };
    return await openModal(options);
  };

  const deleteFile = (fileId) => {
    const options = {
      show: ["modalForm", "modalAction", "modalClose", "modalMessage"],
      action: `/browser/folder/${currentFolderId}/deleteFile`,
      enable: ["fileId"],
      button: "Delete",
      fileId: fileId,
      message: "Delete this file?",
    };
    return openModal(options);
  };

  elements.modalForm.addEventListener("submit", async (e) => {
    elements.modalAction.disabled = true;
    e.preventDefault();

    const formData = new FormData(elements.modalForm);
    const body = new URLSearchParams(formData);
    try {
      const response = await fetch(elements.modalForm.action, {
        method: elements.modalForm.method,
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

      if (result.folderContents) {
        renderFolderContents(result.folderContents);
      }
      elements.modalAction.disabled = false;
      if (result.shared) {
        confirmation(
          `Your shared folder link:\n${window.location.origin}/shared/folder/${result.folder.id}`
        );
      } else {
        closeModal();
      }
    } catch (err) {
      console.log(err);
      closeModal();
    }
  });

  elements.modalClose.addEventListener("click", closeModal);
  return {
    loading,
    newFolder,
    renameFolder,
    shareFolder,
    unshareFolder,
    moveFolder,
    deleteFolder,
    renameFile,
    shareFile,
    unshareFile,
    moveFile,
    deleteFile,
    closeModal,
  };
})();

export { modalHandler };
