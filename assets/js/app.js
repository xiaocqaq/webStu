
const tree = document.querySelector("#tree");
const toc = document.querySelector("#toc");
const courseMap = document.querySelector("#courseMap");
const searchInput = document.querySelector("#search");
const searchResults = document.querySelector("#searchResults");
const searchResultList = document.querySelector("#searchResultList");
const nodeCountEl = document.querySelector("#nodeCount");
const matchCountEl = document.querySelector("#matchCount");
const emptyEl = document.querySelector("#empty");
const readingPin = document.querySelector("#readingPin");
const readingPinText = document.querySelector("#readingPinText");
const mobileMenuBtn = document.querySelector("#mobileMenuBtn");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const drawerCloseBtn = document.querySelector("#drawerCloseBtn");
const sidebarToggleBtn = document.querySelector("#sidebarToggleBtn");
const themeBtn = document.querySelector("#themeBtn");
const expandBtn = document.querySelector("#expandBtn");
const collapseBtn = document.querySelector("#collapseBtn");
const clearBtn = document.querySelector("#clearBtn");
const topicChips = document.querySelector("#topicChips");
const backToTopBtn = document.querySelector("#backToTopBtn");

const state = {
  total: 0,
  query: ""
};

let lastScrollY = window.scrollY;
const backToTopThreshold = 280;
const backToTopScrollDelta = 8;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function splitSearchTerms(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function orderedCharMatch(text, keyword) {
  let cursor = 0;
  for (const char of keyword) {
    cursor = text.indexOf(char, cursor);
    if (cursor === -1) return false;
    cursor += char.length;
  }
  return true;
}

function fuzzyMatch(text, keyword) {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return true;
  if (normalizedText.includes(normalizedKeyword)) return true;

  const terms = splitSearchTerms(normalizedKeyword);
  if (terms.length > 1 && terms.every(term => fuzzyMatch(normalizedText, term))) return true;

  return orderedCharMatch(normalizedText, normalizedKeyword);
}

function plainNodeText(node) {
  const parts = [node.title, node.summary, node.source, node.tag];
  if (node.points) parts.push(...node.points);
  if (node.code) parts.push(node.code);
  if (node.children) parts.push(...node.children.map(plainNodeText));
  return parts.filter(Boolean).join(" ");
}

function plainSelfText(node) {
  const parts = [node.title, node.summary, node.source, node.tag];
  if (node.points) parts.push(...node.points);
  if (node.code) parts.push(node.code);
  return parts.filter(Boolean).join(" ");
}

function highlight(value) {
  const raw = String(value || "");
  const query = state.query.trim();
  if (!query) return escapeHtml(raw);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapeHtml(raw).replace(new RegExp(escaped, "gi"), match => `<mark>${match}</mark>`);
}

function renderContent(node) {
  const parts = [];
  if (node.summary) parts.push(`<p>${highlight(node.summary)}</p>`);
  if (node.points) {
    parts.push(`<ul>${node.points.map(point => `<li>${highlight(point)}</li>`).join("")}</ul>`);
  }
  if (node.code) {
    parts.push(`<pre><code>${highlight(node.code)}</code></pre>`);
  }
  return parts.join("");
}

function renderNode(node, path = [], level = 1) {
  state.total += 1;
  const id = `node-${state.total}`;
  node._id = id;
  const nextPath = [...path, node.title];
  const children = node.children || [];
  const text = normalizeText(plainNodeText(node));
  const selfText = normalizeText(plainSelfText(node));
  const titleText = normalizeText(node.title);
  const badge = node.tag || (children.length ? `${children.length} 项` : "知识点");
  const content = renderContent(node);
  return `
    <details class="node" id="${id}" data-level="${level}" data-text="${escapeHtml(text)}" data-self-text="${escapeHtml(selfText)}" data-title-text="${escapeHtml(titleText)}" data-path="${escapeHtml(nextPath.join(" - "))}" data-title="${escapeHtml(node.title)}">
      <summary>
        <span class="summary-main">
          <span class="node-title">${highlight(node.title)}</span>
          <span class="node-path">${highlight(nextPath.join(" - "))}</span>
        </span>
        <span class="badge">${escapeHtml(badge)}</span>
      </summary>
      <div class="content">
        ${content}
        ${children.map(child => renderNode(child, nextPath, level + 1)).join("")}
      </div>
    </details>
  `;
}

function render() {
  state.total = 0;
  tree.innerHTML = knowledge.map(node => renderNode(node)).join("");
  nodeCountEl.textContent = state.total;
  matchCountEl.textContent = state.total;
  renderToc();
  renderCourseMap();
}

function renderToc() {
  toc.innerHTML = knowledge.map(node => {
    const children = node.children || [];
    const sub = children.length
      ? `<ul class="toc-sub">${children.map(child => `<li><a href="#${child._id}">${escapeHtml(child.title)}</a></li>`).join("")}</ul>`
      : "";
    return `<li><a class="toc-parent" href="#${node._id}">${escapeHtml(node.title)}</a>${sub}</li>`;
  }).join("");
}

function mapNodeTitle(title) {
  return title.length > 18 ? `${title.slice(0, 18)}...` : title;
}

function renderMapNode(node, depth = 0, stageIndex = 0) {
  const children = depth < 2 ? (node.children || []).slice(0, depth === 0 ? 9 : 6) : [];
  const className = [
    "map-node",
    depth === 0 ? "map-root" : "",
    `stage-${stageIndex}`
  ].filter(Boolean).join(" ");
  return `
    <div class="${className}">
      <a class="map-button" href="#${node._id}" title="${escapeHtml(node.title)}">${escapeHtml(mapNodeTitle(node.title))}</a>
      ${children.length ? `<div class="map-children">${children.map((child, index) => renderMapNode(child, depth + 1, depth === 0 ? index : stageIndex)).join("")}</div>` : ""}
    </div>
  `;
}

function renderCourseMap() {
  const rootNode = {
    title: "Pink前端课程",
    _id: "tree",
    children: knowledge
  };
  courseMap.innerHTML = `<div class="map-tree">${renderMapNode(rootNode)}</div>`;
}

function focusNodeById(id) {
  const node = document.getElementById(id);
  if (!node) return;
  let parent = node.parentElement?.closest("details.node");
  while (parent) {
    parent.open = true;
    parent = parent.parentElement?.closest("details.node");
  }
  node.open = true;
  node.classList.add("search-focus");
  node.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => node.classList.remove("search-focus"), 1600);
}

function getPinnedPath(path) {
  const parts = String(path || "").split(" - ").filter(Boolean);
  return parts.slice(0, 2).join(" / ");
}

function updateReadingPin() {
  const currentNode = getCurrentReadingNode();

  const path = getPinnedPath(currentNode?.dataset.path);
  readingPin.classList.toggle("is-hidden", !path);
  readingPinText.textContent = path || "";
  updateActiveToc(currentNode);
}

function scheduleReadingPinUpdate() {
  window.requestAnimationFrame(updateReadingPin);
}

function updateBackToTopVisibility() {
  const currentY = window.scrollY;

  if (currentY <= backToTopThreshold) {
    backToTopBtn.classList.remove("is-visible");
  } else if (currentY + backToTopScrollDelta < lastScrollY) {
    backToTopBtn.classList.add("is-visible");
  } else if (currentY > lastScrollY + backToTopScrollDelta) {
    backToTopBtn.classList.remove("is-visible");
  }

  lastScrollY = currentY;
}

function scheduleScrollUiUpdate() {
  window.requestAnimationFrame(() => {
    updateReadingPin();
    updateBackToTopVisibility();
  });
}

function getCurrentReadingNode() {
  const visibleNodes = [...tree.querySelectorAll("details.node:not(.is-hidden)")];
  let currentNode = null;

  for (const node of visibleNodes) {
    const rect = node.getBoundingClientRect();
    if (rect.top <= 78 && rect.bottom > 78) {
      currentNode = node;
    }
  }

  return currentNode || visibleNodes.find(node => node.getBoundingClientRect().top > 78);
}

function openNodeAncestors(node) {
  let current = node;
  while (current) {
    current.open = true;
    current = current.parentElement?.closest("details.node");
  }
}

function restoreReadingPosition(anchorPath, anchorOffset, fallbackScrollTop) {
  const anchor = anchorPath
    ? [...tree.querySelectorAll("details.node")].find(node => node.dataset.path === anchorPath)
    : null;

  if (anchor) {
    openNodeAncestors(anchor);
    window.scrollTo({
      top: window.scrollY + anchor.getBoundingClientRect().top - anchorOffset,
      left: 0,
      behavior: "auto"
    });
  } else {
    window.scrollTo({ top: fallbackScrollTop, left: 0, behavior: "auto" });
  }

  updateReadingPin();
}

function focusSearchInputWithoutScroll() {
  try {
    searchInput.focus({ preventScroll: true });
  } catch (error) {
    searchInput.focus();
  }
}

function setActiveChip(chip) {
  topicChips.querySelectorAll(".chip").forEach(item => {
    item.classList.toggle("is-active", item === chip);
  });
}

function jumpToSection(title) {
  const section = knowledge.find(node => node.title === title);
  if (!section?._id) return;
  closeDrawer();
  history.replaceState(null, "", `#${section._id}`);
  focusNodeById(section._id);
}

function setDrawerOpen(open) {
  document.body.classList.toggle("drawer-open", open);
  mobileMenuBtn.setAttribute("aria-expanded", String(open));
}

function closeDrawer() {
  setDrawerOpen(false);
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggleBtn.setAttribute("aria-label", collapsed ? "展开侧边栏" : "折叠侧边栏");
  window.requestAnimationFrame(updateReadingPin);
}

function findTocLinkForNode(node) {
  let current = node;
  while (current) {
    const link = [...toc.querySelectorAll("a")].find(item => item.getAttribute("href") === `#${current.id}`);
    if (link) return link;
    current = current.parentElement?.closest("details.node");
  }
  return null;
}

function updateActiveToc(currentNode) {
  toc.querySelectorAll("a.is-active").forEach(link => link.classList.remove("is-active"));
  if (!currentNode || document.body.classList.contains("sidebar-collapsed")) return;

  const activeLink = findTocLinkForNode(currentNode);
  if (!activeLink) return;

  activeLink.classList.add("is-active");
  const sidebar = activeLink.closest(".sidebar");
  if (!sidebar) return;

  const linkTop = activeLink.offsetTop;
  const centeredTop = linkTop - (sidebar.clientHeight / 2) + (activeLink.offsetHeight / 2);
  sidebar.scrollTo({ top: Math.max(0, centeredTop), behavior: "smooth" });
}

function renderSearchResults(matchedNodes, query) {
  if (!query) {
    searchResults.classList.add("is-hidden");
    searchResultList.innerHTML = "";
    return;
  }

  const topMatches = matchedNodes.slice(0, 60);
  searchResults.classList.remove("is-hidden");
  if (!topMatches.length) {
    searchResultList.innerHTML = `<div class="search-result"><strong>没有可跳转结果</strong><span>换一个关键词试试</span></div>`;
    return;
  }

  searchResultList.innerHTML = topMatches.map(node => `
    <a class="search-result" href="#${node.id}" data-target="${node.id}">
      <strong>${highlight(node.dataset.title || "")}</strong>
      <span>${highlight(node.dataset.path || "")}</span>
    </a>
  `).join("");
}

function applySearch() {
  const query = searchInput.value.trim();
  state.query = searchInput.value.trim();
  const nodes = [...tree.querySelectorAll("details.node")];

  if (!query) {
    matchCountEl.textContent = state.total;
    renderSearchResults([], "");
    return;
  }

  const matchedNodes = [];
  let matches = 0;
  nodes.forEach(node => {
    const matched = fuzzyMatch(node.dataset.selfText, query);
    const titleMatched = fuzzyMatch(node.dataset.titleText, query);
    if (matched) matches += 1;
    if (titleMatched) matchedNodes.push(node);
  });

  matchCountEl.textContent = matches;
  renderSearchResults(matchedNodes, query);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("pinkKnowledgeTheme", theme);
  themeBtn.textContent = theme === "dark" ? "切换亮色" : "切换暗色";
}

themeBtn.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(current);
});

expandBtn.addEventListener("click", () => {
  tree.querySelectorAll("details").forEach(detail => detail.open = true);
  scheduleReadingPinUpdate();
});

collapseBtn.addEventListener("click", () => {
  tree.querySelectorAll("details").forEach(detail => detail.open = false);
  scheduleReadingPinUpdate();
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  matchCountEl.textContent = state.total;
  renderSearchResults([], "");
  focusSearchInputWithoutScroll();
});

topicChips.addEventListener("click", event => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  const title = chip.dataset.section;
  if (!title) return;
  jumpToSection(title);
  setActiveChip(chip);
});

backToTopBtn.addEventListener("click", () => {
  closeDrawer();
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  backToTopBtn.classList.remove("is-visible");
  lastScrollY = 0;
  scheduleReadingPinUpdate();
});

searchResultList.addEventListener("click", event => {
  const link = event.target.closest("[data-target]");
  if (!link) return;
  event.preventDefault();
  history.replaceState(null, "", `#${link.dataset.target}`);
  focusNodeById(link.dataset.target);
  closeDrawer();
});

searchInput.addEventListener("input", applySearch);
mobileMenuBtn.addEventListener("click", () => {
  setDrawerOpen(!document.body.classList.contains("drawer-open"));
});
sidebarToggleBtn.addEventListener("click", () => {
  setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
});
drawerBackdrop.addEventListener("click", closeDrawer);
drawerCloseBtn.addEventListener("click", closeDrawer);
toc.addEventListener("click", event => {
  if (event.target.closest("a")) closeDrawer();
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDrawer();
});
window.addEventListener("scroll", scheduleScrollUiUpdate, { passive: true });
window.addEventListener("resize", scheduleScrollUiUpdate);

const savedTheme = localStorage.getItem("pinkKnowledgeTheme");
setTheme(savedTheme || "light");
render();
updateReadingPin();