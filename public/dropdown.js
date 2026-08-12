const dropdownButtons = document.querySelectorAll(
  "button[name='dropdown-button']"
);
const dropdowns = document.querySelectorAll(".menu-items");

dropdownButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetDropdown = document.querySelector(`#${button.dataset.target}`);
    dropdowns.forEach((dropdown) => {
        if (dropdown === targetDropdown) {
            dropdown.classList.toggle("open");
        } else {
            dropdown.classList.remove("open");
        }   
    });
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("button[name='dropdown-button']")) {
    return;
  }

  dropdowns.forEach((dropdown) => {
    if (
      dropdown.classList.contains("open") &&
      !dropdown.contains(event.target)
    ) {
      dropdown.classList.remove("open");
    }
  });
});
