// local-plugins/sidebar-panels/src/sidebarPanels.css
var sidebarPanels_default = "/*\n * One bordered panel containing Recent Notes, Explorer and Tag Explorer as collapsible sections.\n *\n * This replaces the previous approach of capping each panel's height separately. Three independent\n * panels competed for space in the sidebar's flex column, which is what shrank the Tag Explorer to a\n * rendered height of 0. A single scroll container removes that competition structurally.\n */\n.left.sidebar .sidebar-panels {\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  padding: 0.25rem 0.6rem;\n  /* one scroll area for all three sections */\n  max-height: min(32rem, calc(100vh - 12rem));\n  overflow-y: auto;\n  min-height: 0;\n  flex: 0 1 auto;\n}\n\n/* Quartz wraps each group member in a positioning div; keep those transparent to the layout. */\n.left.sidebar .sidebar-panels > div {\n  min-width: 0;\n}\n\n/* Divider between sections. */\n.left.sidebar .sidebar-panels > div + div {\n  border-top: 1px solid var(--lightgray);\n  margin-top: 0.4rem;\n  padding-top: 0.4rem;\n}\n\n/* The sections now scroll together, so drop the individual caps. */\n.left.sidebar .sidebar-panels .recent-notes,\n.left.sidebar .sidebar-panels .tag-explorer,\n.left.sidebar .sidebar-panels .explorer {\n  max-height: none;\n  overflow: visible;\n}\n\n/* --- collapsible headers (Recent Notes / Tag Explorer) ---\n   Styled to match the Explorer's own .title-button so the three read as one control set. */\n.left.sidebar .sidebar-panels .panel-toggle {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.4rem;\n  width: 100%;\n  padding: 0;\n  margin: 0.35rem 0;\n  background: none;\n  border: none;\n  cursor: pointer;\n  color: inherit;\n  font-family: inherit;\n  text-align: left;\n}\n\n.left.sidebar .sidebar-panels .panel-toggle h3 {\n  margin: 0;\n  font-size: 1rem;\n  opacity: 0.85;\n}\n\n.left.sidebar .sidebar-panels .panel-toggle:hover h3 {\n  color: var(--secondary);\n}\n\n.left.sidebar .sidebar-panels .panel-chevron {\n  flex: 0 0 auto;\n  opacity: 0.6;\n  transition: transform 0.15s ease;\n}\n\n/* Chevron points down when open, right when collapsed. */\n.left.sidebar .sidebar-panels .panel-collapsed .panel-chevron {\n  transform: rotate(-90deg);\n}\n\n.left.sidebar .sidebar-panels .panel-collapsed .panel-content {\n  display: none;\n}\n";

// local-plugins/sidebar-panels/src/sidebarPanels.inline.ts
var sidebarPanels_inline_default = '"use strict";\n(() => {\n  // local-plugins/sidebar-panels/src/sidebarPanels.inline.ts\n  var STORAGE_PREFIX = "sidebar-panel:";\n  function chevron() {\n    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");\n    svg.setAttribute("viewBox", "0 0 24 24");\n    svg.setAttribute("width", "14");\n    svg.setAttribute("height", "14");\n    svg.setAttribute("fill", "none");\n    svg.setAttribute("stroke", "currentColor");\n    svg.setAttribute("stroke-width", "2");\n    svg.setAttribute("stroke-linecap", "round");\n    svg.setAttribute("stroke-linejoin", "round");\n    svg.classList.add("panel-chevron");\n    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");\n    path.setAttribute("points", "6 9 12 15 18 9");\n    svg.appendChild(path);\n    return svg;\n  }\n  function readState(key, fallback) {\n    try {\n      const stored = localStorage.getItem(STORAGE_PREFIX + key);\n      if (stored === "open") return true;\n      if (stored === "closed") return false;\n    } catch {\n    }\n    return fallback;\n  }\n  function writeState(key, open) {\n    try {\n      localStorage.setItem(STORAGE_PREFIX + key, open ? "open" : "closed");\n    } catch {\n    }\n  }\n  function makeCollapsible(panel, key, defaultOpen) {\n    if (panel.dataset.collapsibleReady === "true") return;\n    const heading = panel.querySelector(":scope > h3");\n    if (!(heading instanceof HTMLElement)) return;\n    panel.dataset.collapsibleReady = "true";\n    const content = document.createElement("div");\n    content.className = "panel-content";\n    let node = heading.nextSibling;\n    while (node) {\n      const next = node.nextSibling;\n      content.appendChild(node);\n      node = next;\n    }\n    const button = document.createElement("button");\n    button.type = "button";\n    button.className = "title-button panel-toggle";\n    heading.replaceWith(button);\n    button.append(heading, chevron());\n    panel.append(content);\n    const apply = (open) => {\n      button.setAttribute("aria-expanded", String(open));\n      panel.classList.toggle("panel-collapsed", !open);\n    };\n    apply(readState(key, defaultOpen));\n    button.addEventListener("click", () => {\n      const open = button.getAttribute("aria-expanded") !== "true";\n      apply(open);\n      writeState(key, open);\n    });\n  }\n  function setup() {\n    const sidebar = document.querySelector(".left.sidebar");\n    if (!sidebar) return;\n    const anchor = sidebar.querySelector(".explorer") ?? sidebar.querySelector(".recent-notes") ?? sidebar.querySelector(".tag-explorer");\n    const group = anchor?.closest(".flex-component");\n    if (!(group instanceof HTMLElement)) return;\n    group.classList.add("sidebar-panels");\n    const recent = group.querySelector(".recent-notes");\n    if (recent instanceof HTMLElement) makeCollapsible(recent, "recent-notes", true);\n    const tags = group.querySelector(".tag-explorer");\n    if (tags instanceof HTMLElement) makeCollapsible(tags, "tag-explorer", true);\n  }\n  setup();\n  document.addEventListener("nav", setup);\n})();\n';

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
