const themeButton = document.querySelector("#theme-toggle");

if (themeButton) {
  themeButton.addEventListener("click", async () => {
    const res = await fetch("/theme/toggle", {
      method: "POST",
    });

    const data = await res.json();

    // update UI instantly
    document.documentElement.dataset.theme = data.theme;
    themeButton.setAttribute("aria-pressed", data.theme === "dark");
    themeButton
      .querySelector("svg use")
      .setAttribute("href", `#icon-${data.theme}`);
  });
}
