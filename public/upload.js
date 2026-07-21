const uploadForm = document.querySelector('#upload-form');
const fileInput = document.querySelector('#upload-files');
const loadingOverlay = document.querySelector('#loading-overlay');
const newFolder = document.querySelector('#new-folder');
const newFolderForm = document.querySelector('#new-folder-form');
const newFolderName = document.querySelector('#new-folder-name');
const loadingMessage = document.querySelector('#loading-message');

fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length) {
        return;
    }
    loadingMessage.textContent = "Uploading files...";
    loadingOverlay.classList.remove("hidden");

    const formData = new FormData(uploadForm);

    try {
        const response = await fetch(uploadForm.action, {
            method: uploadForm.method,
            body: formData,
        });

        const result = await response.json();

        if (!result.success) {
            // TODO ERRORS
            return;
        }

        renderFolderContents(result.folderContents);
    } catch (err) {
        console.log(err);
    } finally {
        loadingOverlay.classList.add("hidden");
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

newFolder.addEventListener('click', async () => {
    const name = prompt("New folder name: ");
    if (!name || name === "") return; 

    loadingMessage.textContent = "Creating folder...";
    loadingOverlay.classList.remove("hidden");
    const body = new URLSearchParams();
    body.append("newFolderName", name);
    try {
        const response = await fetch(newFolderForm.action, {
            method: newFolderForm.method,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body,
        });

        const result = await response.json();

        if (!result.success) {
            // TODO ERRORS
            return;
        }

        renderFolderContents(result.folderContents);
    } catch (err) {
        console.log(err);
    } finally {
        loadingOverlay.classList.add("hidden");
    }
});