// local-plugins/sidebar-panels/src/sidebarPanels.css
var sidebarPanels_default = "/*\n * One bordered panel containing Recent Notes, Explorer and Tag Explorer as collapsible sections.\n *\n * This replaces the previous approach of capping each panel's height separately. Three independent\n * panels competed for space in the sidebar's flex column, which is what shrank the Tag Explorer to a\n * rendered height of 0. A single scroll container removes that competition structurally.\n */\n.left.sidebar .sidebar-panels {\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  padding: 0.25rem 0.6rem;\n  /* one scroll area for all three sections */\n  max-height: min(32rem, calc(100vh - 12rem));\n  overflow-y: auto;\n  min-height: 0;\n  flex: 0 1 auto;\n}\n\n/* Quartz wraps each group member in a positioning div with an inline `align-self: center`. In a\n   column group that centres each section on its own width, so a narrower section (Tag Explorer)\n   ends up indented relative to the others. Stretch them so every header shares one left edge. */\n.left.sidebar .sidebar-panels > div {\n  min-width: 0;\n  align-self: stretch;\n  width: 100%;\n}\n\n/* Divider between sections. */\n.left.sidebar .sidebar-panels > div + div {\n  border-top: 1px solid var(--lightgray);\n  margin-top: 0.4rem;\n  padding-top: 0.4rem;\n}\n\n/* The sections now scroll together, so drop the individual caps. */\n.left.sidebar .sidebar-panels .recent-notes,\n.left.sidebar .sidebar-panels .tag-explorer,\n.left.sidebar .sidebar-panels .explorer {\n  max-height: none;\n  overflow: visible;\n}\n\n/* --- Explorer normalisation ---\n   The Explorer is written to fill the sidebar itself: its .explorer-content is `max-height: 100%`\n   with `overflow: hidden` (and absolutely positioned as a full-screen drawer on mobile). Inside this\n   panel that clipped the whole tree to ~59px. Let it size to its content and scroll with the panel.\n   Its own toggle buttons are hidden because the script replaces them with the shared header, so all\n   three sections look and behave the same. */\n.left.sidebar .sidebar-panels .explorer > .explorer-toggle {\n  display: none;\n}\n\n/* The Explorer's toggle is APPENDED (last child) rather than prepended so it doesn't shift the\n   Explorer's client-render templates during SPA navigation (see sidebarPanels.inline.ts). The\n   Explorer is already a flex column, so `order: -1` shows the appended toggle first. */\n.left.sidebar .sidebar-panels .explorer > .panel-toggle {\n  order: -1;\n}\n\n.left.sidebar .sidebar-panels .explorer .explorer-content {\n  position: static;\n  transform: none;\n  visibility: visible;\n  width: auto;\n  max-width: none;\n  height: auto;\n  max-height: none;\n  overflow: visible;\n  padding: 0;\n  margin: 0;\n  background: none;\n}\n\n/* The Explorer's list is its own scroll container with `overscroll-behavior: contain`, which\n   swallows wheel events while the pointer is over it \u2014 so the sidebar wouldn't scroll when hovering\n   the file tree. The panel is the single scroll container now, so let the wheel through. */\n.left.sidebar .sidebar-panels .explorer .explorer-ul {\n  overscroll-behavior: auto;\n  overflow: visible;\n  max-height: none;\n}\n\n/* --- Recent Notes normalisation ---\n   Each entry's title is a bare <h3>, so it inherits the site's full heading size and towers over the\n   Explorer's and Tag Explorer's links. Strip the heading treatment so an entry is styled exactly like\n   an Explorer file row: same font size, weight, line-height and no row margins.\n\n   Long titles wrap, exactly as they do in the Explorer \u2014 it sets no white-space/text-overflow rules\n   at all, so its rows wrap too. (An earlier attempt truncated these with an ellipsis, which made them\n   *differ* from the Explorer rather than match it.) */\n.left.sidebar .sidebar-panels .recent-notes .recent-li .desc h3 {\n  margin: 0;\n  font-size: 0.95rem;\n  /* 1.5rem == the Explorer's exact 24px, independent of this element's font-size (a unitless\n     multiplier would resolve against 15.2px and land at 24.32px instead). */\n  line-height: 1.5rem;\n  font-weight: inherit;\n}\n\n/* Quartz gives links their own line-height (22.4px), which left the rows fractionally tighter than\n   the Explorer's 24px. Inherit the heading's instead so wrapped rows line up between the sections. */\n.left.sidebar .sidebar-panels .recent-notes .recent-li .desc h3 a {\n  line-height: inherit;\n}\n\n.left.sidebar .sidebar-panels .recent-notes .recent-li {\n  margin: 0;\n}\n\n.left.sidebar .sidebar-panels .recent-notes .recent-ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n/* --- collapsible headers (Recent Notes / Explorer / Tag Explorer) ---\n   Styled to match the Explorer's own .title-button so the three read as one control set. */\n.left.sidebar .sidebar-panels .panel-toggle {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.4rem;\n  width: 100%;\n  padding: 0;\n  margin: 0.35rem 0;\n  background: none;\n  border: none;\n  cursor: pointer;\n  color: inherit;\n  font-family: inherit;\n  text-align: left;\n}\n\n.left.sidebar .sidebar-panels .panel-toggle h3 {\n  margin: 0;\n  font-size: 1rem;\n  opacity: 0.85;\n}\n\n.left.sidebar .sidebar-panels .panel-toggle:hover h3 {\n  color: var(--secondary);\n}\n\n.left.sidebar .sidebar-panels .panel-chevron {\n  flex: 0 0 auto;\n  opacity: 0.6;\n  transition: transform 0.15s ease;\n}\n\n/* Chevron points down when open, right when collapsed. */\n.left.sidebar .sidebar-panels .panel-collapsed .panel-chevron {\n  transform: rotate(-90deg);\n}\n\n.left.sidebar .sidebar-panels .panel-collapsed .panel-content {\n  display: none;\n}\n";

// local-plugins/sidebar-panels/src/sidebarPanels.inline.ts
var sidebarPanels_inline_default = `"use strict";
(() => {
  // local-plugins/sidebar-panels/src/sidebarPanels.inline.ts
  var STORAGE_KEY = "sidebar-panels:open";
  function chevron() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("panel-chevron");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    path.setAttribute("points", "6 9 12 15 18 9");
    svg.appendChild(path);
    return svg;
  }
  function readOpenKey() {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }
  function writeOpenKey(key) {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
    }
  }
  function buildSection(panel, key, label, existingContent, appendToggle = false) {
    if (panel.dataset.collapsibleReady === "true") {
      const existing = panel.querySelector(":scope > .panel-toggle");
      return existing instanceof HTMLButtonElement ? { key, panel, button: existing } : null;
    }
    panel.dataset.collapsibleReady = "true";
    let content;
    if (existingContent) {
      content = existingContent;
      content.classList.add("panel-content");
    } else {
      const heading = panel.querySelector(":scope > h3");
      content = document.createElement("div");
      content.className = "panel-content";
      let node = heading ? heading.nextSibling : panel.firstChild;
      while (node) {
        const next = node.nextSibling;
        content.appendChild(node);
        node = next;
      }
      heading?.remove();
      panel.append(content);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "title-button panel-toggle";
    const h3 = document.createElement("h3");
    h3.textContent = label;
    button.append(h3, chevron());
    if (appendToggle) panel.append(button);
    else panel.prepend(button);
    return { key, panel, button };
  }
  function setup() {
    const sidebar = document.querySelector(".left.sidebar");
    if (!sidebar) return;
    const anchor = sidebar.querySelector(".explorer") ?? sidebar.querySelector(".recent-notes") ?? sidebar.querySelector(".tag-explorer");
    const group = anchor?.closest(".flex-component");
    if (!(group instanceof HTMLElement)) return;
    group.classList.add("sidebar-panels");
    const sections = [];
    const recent = group.querySelector(".recent-notes");
    if (recent instanceof HTMLElement) {
      const section = buildSection(recent, "recent-notes", "Recent Notes");
      if (section) sections.push(section);
    }
    const explorer = group.querySelector(".explorer");
    if (explorer instanceof HTMLElement) {
      const content = explorer.querySelector(".explorer-content");
      const section = buildSection(
        explorer,
        "explorer",
        "Explorer",
        content instanceof HTMLElement ? content : null,
        true
        // append the toggle \u2014 see buildSection (micromorph corrupts the Explorer's templates otherwise)
      );
      if (section) sections.push(section);
    }
    const tags = group.querySelector(".tag-explorer");
    if (tags instanceof HTMLElement) {
      const section = buildSection(tags, "tag-explorer", "Tag Explorer");
      if (section) sections.push(section);
    }
    if (sections.length === 0) return;
    const apply = (openKey) => {
      for (const section of sections) {
        const open = section.key === openKey;
        section.button.setAttribute("aria-expanded", String(open));
        section.panel.classList.toggle("panel-collapsed", !open);
      }
    };
    apply(readOpenKey());
    for (const section of sections) {
      if (section.button.dataset.accordionBound === "true") continue;
      section.button.dataset.accordionBound = "true";
      section.button.addEventListener("click", () => {
        const isOpen = section.button.getAttribute("aria-expanded") === "true";
        const next = isOpen ? "" : section.key;
        apply(next);
        writeOpenKey(next);
      });
    }
  }
  var explorerStatus = "";
  var EXPLORER_OK = /Render complete/;
  var EXPLORER_STUCK = /skipping tree render|No trie or empty children|No data received|No content/;
  (function hookConsoleForExplorer() {
    const methods = ["log", "warn", "error"];
    for (const method of methods) {
      const original = console[method].bind(console);
      console[method] = (...args) => {
        const first = args[0];
        if (typeof first === "string" && first.includes("[Explorer]")) {
          if (EXPLORER_OK.test(first)) explorerStatus = "ok";
          else if (EXPLORER_STUCK.test(first)) explorerStatus = "stuck";
        }
        original(...args);
      };
    }
  })();
  function explorerIsEmpty() {
    const ul = document.querySelector(".left.sidebar .explorer .explorer-ul");
    if (!ul) return false;
    return ul.querySelector(".folder-container, .nav-file-title, .nav-folder-title") === null;
  }
  var healToken = 0;
  function healExplorer() {
    const token = ++healToken;
    const maxDispatches = 3;
    const graceMs = 4e3;
    let dispatches = 0;
    let elapsed = 0;
    const stepMs = 300;
    const tick = () => {
      if (token !== healToken) return;
      if (!explorerIsEmpty()) return;
      if (explorerStatus === "ok") return;
      const stuck = explorerStatus === "stuck" || elapsed >= graceMs;
      if (stuck && dispatches < maxDispatches) {
        dispatches += 1;
        explorerStatus = "";
        document.dispatchEvent(new CustomEvent("render"));
      }
      if (dispatches >= maxDispatches) return;
      elapsed += stepMs;
      window.setTimeout(tick, stepMs);
    };
    window.setTimeout(tick, stepMs);
  }
  setup();
  healExplorer();
  document.addEventListener("nav", () => {
    setup();
    healExplorer();
  });
})();
`;

// local-plugins/sidebar-panels/src/index.ts
var SidebarPanels = () => ({
  name: "SidebarPanels",
  // Quartz validates a transformer instance by looking for at least one of textTransform /
  // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS + JS.
  htmlPlugins() {
    return [];
  },
  externalResources() {
    return {
      css: [{ content: sidebarPanels_default, inline: true, spaPreserve: true }],
      js: [
        {
          loadTime: "afterDOMReady",
          contentType: "inline",
          spaPreserve: true,
          script: sidebarPanels_inline_default
        }
      ]
    };
  }
});
var index_default = SidebarPanels;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
