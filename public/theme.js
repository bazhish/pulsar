(function () {
  const saved = localStorage.getItem("rf_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);

  function syncThemeIcon() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    document.querySelectorAll(".theme-icon").forEach((icon) => {
      icon.textContent = current === "dark" ? "☀" : "🌙";
    });
  }

  function bindThemeToggle() {
    document.querySelectorAll("#themeToggle, [data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("rf_theme", next);
        syncThemeIcon();
      });
    });
    syncThemeIcon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeToggle);
  } else {
    bindThemeToggle();
  }
})();
