const dropdownButtons = document.querySelectorAll(
  "button[name='dropdown-button']"
);
const dropdowns = document.querySelectorAll(".menu-items");

dropdownButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dropdown = document.querySelector(`#${button.dataset.target}`);
    dropdown.classList.toggle("open");
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
