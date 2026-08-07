const aside = document.querySelector("aside");
const toggleButton = document.querySelector("#aside-toggle");

if (toggleButton) {
    toggleButton.addEventListener("click", () => {
        aside.classList.toggle("open");
    })
}