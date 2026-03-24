export function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

export function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateToggleIcon();
}

export function updateToggleIcon() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";
  btn.textContent = isLight ? "\uD83C\uDF19 Dark" : "\u2600\uFE0F Light";
}

export function initThemeToggle() {
  const button = document.querySelector(".theme-toggle");
  if (button && !button.dataset.themeToggleBound) {
    button.addEventListener("click", toggleTheme);
    button.dataset.themeToggleBound = "true";
  }
  updateToggleIcon();
}

applySavedTheme();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeToggle, {
    once: true,
  });
} else {
  initThemeToggle();
}