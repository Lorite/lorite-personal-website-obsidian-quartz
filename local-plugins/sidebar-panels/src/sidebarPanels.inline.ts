/**
 * Presents the three left-sidebar panels (Recent Notes, Explorer, Tag Explorer) as one panel with
 * collapsible sections behaving as an accordion: at most one section is expanded at a time, and the
 * other two stay visible as their collapsed headers. Clicking the open section closes it (all three
 * collapsed — also the first-visit default). The choice is remembered in localStorage.
 *
 * IMPORTANT — how the toggle is injected (this took a while to get right).
 * The community Explorer renders its file tree client-side by cloning `<template id="template-folder">`
 * / `<template id="template-file">` elements that live as the LAST children of `.explorer`. Quartz
 * navigates via micromorph, which reconciles the old and new DOM by child position. If we PREPEND our
 * toggle button as the first child of `.explorer`, every subsequent child is offset by one, so on the
 * next navigation micromorph mis-matches the templates against the wrong nodes and mangles them —
 * the folder template loses its inner `.content` container, the renderer can no longer recurse into
 * children, and the tree collapses to just its top-level folders (looks empty/broken).
 *
 * The fix: APPEND the button (so it's the trailing extra node micromorph simply drops, leaving the
 * templates in their original positions) and use CSS `order: -1` to show it first. We also never move
 * a section's content — collapse is purely a CSS class — so the Explorer's own DOM is left intact.
 */

const STORAGE_KEY = "sidebar-panels:open"

interface Section {
  key: string
  panel: HTMLElement
  button: HTMLButtonElement
}

function chevron(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", "14")
  svg.setAttribute("height", "14")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.classList.add("panel-chevron")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
  path.setAttribute("points", "6 9 12 15 18 9")
  svg.appendChild(path)
  return svg
}

function readOpenKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function writeOpenKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // ignore (private mode)
  }
}

/**
 * Give a panel a collapsible header without moving any of its content.
 * `label` is the section title; any pre-existing `> h3` heading is hidden (the toggle carries the
 * label instead) but left in the DOM so nothing is restructured.
 */
function buildSection(panel: HTMLElement, key: string, label: string): Section | null {
  const existing = panel.querySelector(":scope > .panel-toggle")
  if (existing instanceof HTMLButtonElement) {
    return { key, panel, button: existing }
  }

  const button = document.createElement("button")
  button.type = "button"
  button.className = "title-button panel-toggle"
  const h3 = document.createElement("h3")
  h3.textContent = label
  button.append(h3, chevron())

  // Hide (don't remove) the section's own heading so we don't restructure its DOM.
  const ownHeading = panel.querySelector(":scope > h3")
  if (ownHeading instanceof HTMLElement) ownHeading.classList.add("panel-orig-heading")

  // APPEND (not prepend) — see the file header. CSS `order: -1` shows it first. Appending keeps the
  // button as the trailing node so micromorph doesn't offset (and mangle) the Explorer's templates.
  panel.append(button)
  return { key, panel, button }
}

function setup() {
  const sidebar = document.querySelector(".left.sidebar")
  if (!sidebar) return

  // Identify the group container by one of its members rather than by class: Quartz renders every
  // layout group as a generic `.flex-component`, so the toolbar looks the same.
  const anchor =
    sidebar.querySelector(".explorer") ??
    sidebar.querySelector(".recent-notes") ??
    sidebar.querySelector(".tag-explorer")
  const group = anchor?.closest(".flex-component")
  if (!(group instanceof HTMLElement)) return
  group.classList.add("sidebar-panels")

  const sections: Section[] = []
  const add = (selector: string, key: string, label: string) => {
    const panel = group.querySelector(selector)
    if (panel instanceof HTMLElement) {
      const section = buildSection(panel, key, label)
      if (section) sections.push(section)
    }
  }
  add(".recent-notes", "recent-notes", "Recent Notes")
  add(".explorer", "explorer", "Explorer")
  add(".tag-explorer", "tag-explorer", "Tag Explorer")

  if (sections.length === 0) return

  // Accordion: exactly the section matching `openKey` is expanded; "" collapses all.
  const apply = (openKey: string) => {
    for (const section of sections) {
      const open = section.key === openKey
      section.button.setAttribute("aria-expanded", String(open))
      section.panel.classList.toggle("panel-collapsed", !open)
    }
  }

  apply(readOpenKey())

  for (const section of sections) {
    if (section.button.dataset.accordionBound === "true") continue
    section.button.dataset.accordionBound = "true"
    section.button.addEventListener("click", () => {
      const isOpen = section.button.getAttribute("aria-expanded") === "true"
      const next = isOpen ? "" : section.key
      apply(next)
      writeOpenKey(next)
    })
  }
}

setup()
// Quartz's SPA router replaces the sidebar contents without a full page load.
document.addEventListener("nav", setup)
