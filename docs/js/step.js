import { initThemeToggle } from "./theme-toggle.js";
import { completionStepIds, REPO_NAME, REPO_OWNER, steps } from "./stepcfg.js";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";
const GITHUB_RAW_BASE = isLocal
  ? "../workshop/"
  : `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/workshop/`;
let mermaidTheme = null;

function getMermaidApi() {
  return globalThis.mermaid;
}

function getMermaidTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "default"
    : "dark";
}

function ensureMermaidInitialized() {
  const mermaid = getMermaidApi();
  if (!mermaid) return null;
  const nextTheme = getMermaidTheme();
  if (mermaidTheme !== nextTheme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: nextTheme,
    });
    mermaidTheme = nextTheme;
  }
  return mermaid;
}

function getCurrentStepId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("step") || "00-overview";
}

function getCurrentStepIndex() {
  const stepId = getCurrentStepId();
  return steps.findIndex((s) => s.id === stepId);
}

function buildSidebar() {
  const nav = document.getElementById("stepNav");
  const currentId = getCurrentStepId();

  nav.innerHTML = steps
    .map((step) => {
      const isHome = step.title === "Home";
      const href = isHome ? "index.html" : `?step=${step.id}`;
      return `
                <a href="${href}" class="step-link ${step.id === currentId ? "active" : ""}">
                    <span class="step-number">${step.number}</span>
                    <span>${step.title}</span>
                </a>
            `;
    })
    .join("");
}

function updateNavigation() {
  const idx = getCurrentStepIndex();
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const prevLink = document.getElementById("prevLink");
  const nextLink = document.getElementById("nextLink");

  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= steps.length - 1;

  prevBtn.onclick = () =>
    idx > 0 && (window.location.search = `?step=${steps[idx - 1].id}`);
  nextBtn.onclick = () =>
    idx < steps.length - 1 &&
    (window.location.search = `?step=${steps[idx + 1].id}`);

  if (idx > 0) {
    prevLink.href = `?step=${steps[idx - 1].id}`;
    prevLink.textContent = `← ${steps[idx - 1].title}`;
    prevLink.classList.remove("disabled");
  } else {
    prevLink.classList.add("disabled");
    prevLink.textContent = "← Previous";
  }

  if (idx < steps.length - 1) {
    nextLink.href = `?step=${steps[idx + 1].id}`;
    nextLink.textContent = `${steps[idx + 1].title} →`;
    nextLink.classList.remove("disabled");
  } else {
    nextLink.classList.add("disabled");
    nextLink.textContent = "Next →";
  }
}

function enableTaskListCheckboxes(stepId) {
  const checkboxes = Array.from(
    document.querySelectorAll('#markdown-content input[type="checkbox"]'),
  );
  if (!checkboxes.length) return;

  const storageKey = `lab-checklist:${stepId}`;
  let savedStates = null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) savedStates = JSON.parse(raw);
  } catch (e) {
    savedStates = null;
  }

  checkboxes.forEach((checkbox, index) => {
    checkbox.removeAttribute("disabled");
    if (Array.isArray(savedStates) && typeof savedStates[index] === "boolean") {
      checkbox.checked = savedStates[index];
    }
    checkbox.addEventListener("change", () => {
      const currentStates = checkboxes.map((cb) => cb.checked);
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentStates));
      } catch (e) {}
    });
  });
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {}
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

const copyButtonResetTimers = new WeakMap();

function showCopyState(button, state) {
  const labels = {
    idle: "Copy code block to clipboard",
    success: "Copied code block to clipboard",
    error: "Copy failed. Try again",
  };
  button.dataset.state = state;
  button.setAttribute("aria-label", labels[state]);
  button.title = labels[state];
  const existingTimer = copyButtonResetTimers.get(button);
  if (existingTimer) clearTimeout(existingTimer);
  if (state !== "idle") {
    const resetTimer = setTimeout(() => {
      button.dataset.state = "idle";
      button.setAttribute("aria-label", labels.idle);
      button.title = labels.idle;
    }, 2000);
    copyButtonResetTimers.set(button, resetTimer);
  }
}

function createMoreConfettiButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "🎊 More Confetti! 🎊";
  button.style.background =
    "linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))";
  button.style.color = "var(--bg-dark)";
  button.style.border = "none";
  button.style.padding = "1rem 2rem";
  button.style.fontSize = "1.25rem";
  button.style.fontWeight = "700";
  button.style.borderRadius = "12px";
  button.style.cursor = "pointer";
  button.style.margin = "1rem 0";
  button.style.transition = "transform 0.2s, box-shadow 0.2s";
  button.addEventListener("click", bigCelebrate);
  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.05)";
    button.style.boxShadow = "0 10px 40px rgba(0,245,255,0.4)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "none";
  });
  return button;
}

function enhanceCodeBlocks() {
  const blocks = document.querySelectorAll("#markdown-content pre");
  blocks.forEach((pre) => {
    if (
      pre.parentElement &&
      pre.parentElement.classList.contains("code-block-wrapper")
    ) {
      return;
    }
    const code = pre.querySelector("code");
    const wrapper = document.createElement("div");
    const codeClasses = code?.className || "";
    const isDiagramBlock = /(^|\s)language-diagram(\s|$)/.test(codeClasses);
    wrapper.className = "code-block-wrapper";
    if (isDiagramBlock) {
      wrapper.classList.add("diagram-block-wrapper");
    }
    pre.parentNode.insertBefore(wrapper, pre);
    if (!isDiagramBlock) {
      const button = document.createElement("button");
      button.className = "copy-code-btn";
      button.type = "button";
      showCopyState(button, "idle");
      button.addEventListener("click", async () => {
        const codeText = (code ? code.textContent : pre.textContent) || "";
        try {
          await copyText(codeText.trimEnd());
          showCopyState(button, "success");
        } catch (error) {
          showCopyState(button, "error");
        }
      });
      wrapper.appendChild(button);
    }
    wrapper.appendChild(pre);
  });
}

function prepareMermaidBlocks() {
  const blocks = document.querySelectorAll(
    "#markdown-content pre > code.language-mermaid",
  );
  blocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre) return;
    const wrapper = document.createElement("div");
    const source = code.textContent || "";
    wrapper.className = "mermaid-block";
    wrapper.dataset.mermaidSource = source;
    pre.replaceWith(wrapper);
  });
}

async function renderMermaidBlocks() {
  const mermaid = ensureMermaidInitialized();
  if (!mermaid) return;

  const blocks = document.querySelectorAll("#markdown-content .mermaid-block");
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const source = block.dataset.mermaidSource || "";
    block.removeAttribute("data-processed");
    block.innerHTML = "";
    block.textContent = source;
  });

  try {
    await mermaid.run({
      querySelector: "#markdown-content .mermaid-block",
    });
  } catch (error) {
    blocks.forEach((block) => {
      block.classList.add("mermaid-error");
    });
  }
}

function enhanceImages() {
  if (!document.getElementById("lightbox-overlay")) {
    const overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML =
      '<img class="lightbox-img" /><button class="lightbox-close" aria-label="Close">&times;</button>';
    overlay.addEventListener("click", (e) => {
      if (
        e.target === overlay ||
        e.target.classList.contains("lightbox-close")
      ) {
        overlay.classList.remove("active");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") overlay.classList.remove("active");
    });
    document.body.appendChild(overlay);
  }

  const overlay = document.getElementById("lightbox-overlay");
  const lightboxImg = overlay.querySelector(".lightbox-img");

  const images = document.querySelectorAll(
    "#markdown-content img:not(.no-enlarge)",
  );
  images.forEach((img) => {
    if (img.parentElement && img.parentElement.tagName === "A") return;
    if (
      img.parentElement &&
      img.parentElement.classList.contains("image-enlarge-wrap")
    ) {
      return;
    }
    const wrapper = document.createElement("span");
    wrapper.className = "image-enlarge-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "image-enlarge-btn";
    button.setAttribute("aria-label", "Open image in lightbox");
    button.title = "Open image in lightbox";
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(button);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      overlay.classList.add("active");
    });
  });
}

function processMarkdown(md) {
  md = md.replace(/\]\((\d+)-([^)]+)\.md\)/g, "](step.html?step=$1-$2)");

  md = md.replace(/>\s*\[!NOTE\]\s*\n/gi, "> **📝 Note**\n>\n");
  md = md.replace(/>\s*\[!TIP\]\s*\n/gi, "> **💡 Tip**\n>\n");
  md = md.replace(/>\s*\[!IMPORTANT\]\s*\n/gi, "> **⚠️ Important**\n>\n");

  return md;
}

async function loadContent() {
  const idx = getCurrentStepIndex();
  if (idx === -1) {
    document.getElementById("markdown-content").innerHTML =
      '<p>Step not found. <a href="?step=00-overview">Go to Overview</a></p>';
    return;
  }

  const step = steps[idx];
  document.title = `${step.title} | Lab Custom Agents`;

  try {
    const response = await fetch(`${GITHUB_RAW_BASE}${step.file}`);
    if (!response.ok) throw new Error("Failed to load");

    let md = await response.text();
    md = processMarkdown(md);

    const stepDir = step.file.substring(0, step.file.lastIndexOf("/") + 1);
    md = md.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/|\/\/)([^)]+)\)/g,
      (match, alt, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `![${alt}](${GITHUB_RAW_BASE}${stepDir}${cleanPath})`;
      },
    );

    marked.setOptions({ breaks: true, gfm: true });

    document.getElementById("markdown-content").innerHTML = marked.parse(md);
    enableTaskListCheckboxes(step.id);
    prepareMermaidBlocks();
    await renderMermaidBlocks();
    enhanceCodeBlocks();
    enhanceImages();

    if (completionStepIds.includes(step.id)) {
      setTimeout(celebrate, 500);

      const btnContainer = document.getElementById("confetti-btn-container");
      if (btnContainer) {
        btnContainer.replaceChildren(createMoreConfettiButton());
      }
    }
  } catch (error) {
    document.getElementById("markdown-content").innerHTML = `
                    <h1>Error Loading Content</h1>
                    <p>Could not load ${step.file}. Please check your internet connection.</p>
                    <p><a href="index.html">Return to home</a></p>
                `;
  }
}

function celebrate() {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ["#00f5ff", "#ff00ff", "#b366ff", "#00ff88", "#ffff00"];

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function bigCelebrate() {
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ["#00f5ff", "#ff00ff", "#b366ff", "#00ff88", "#ffff00"],
  });
}

initThemeToggle();
buildSidebar();
updateNavigation();
loadContent();

new MutationObserver(async (mutations) => {
  const themeChanged = mutations.some(
    (mutation) =>
      mutation.type === "attributes" && mutation.attributeName === "data-theme",
  );
  if (!themeChanged) return;
  await renderMermaidBlocks();
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

document.addEventListener("keydown", (e) => {
  const idx = getCurrentStepIndex();
  if (e.key === "ArrowLeft" && idx > 0) {
    window.location.search = `?step=${steps[idx - 1].id}`;
  } else if (e.key === "ArrowRight" && idx < steps.length - 1) {
    window.location.search = `?step=${steps[idx + 1].id}`;
  }
});
