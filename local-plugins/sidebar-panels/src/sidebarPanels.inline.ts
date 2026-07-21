/**
 * Turns the three left-sidebar panels (Recent Notes, Explorer, Tag Explorer) into one panel with
 * collapsible sections that look and behave identically.
 *
 * They're placed in a single Quartz layout group (see the `sidebar-panels` group in
 * quartz.config.yaml), which renders them inside one `.flex-component` container. That container
 * gets a `sidebar-panels` class here so the CSS can style it as a single bordered panel.
 *
 * All three sections get the same header treatment. The Explorer ships its own toggle
 * (`button.explorer-toggle` around an <h2>), but inside this panel it doesn't work — its handler
 * never updates `aria-expanded` — and its <h2> looks nothing like the other sections' <h3>. So its
 * native toggles are hidden (via CSS) and it gets the same generated header as the others, using
 * its existing `.explorer-content` as the collapsible body.
 *
 * Open/closed state is remembered in localStorage. Sections default to collapsed.
 */

const STORAGE_PREFIX = "sidebar-panel:"

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

function readState(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)
    if (stored === "open") return true
    if (stored === "closed") return false
  } catch {
    // localStorage can throw in private mode; fall back to the default.
  }
  return fallback
}

function writeState(key: string, open: boolean) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, open ? "open" : "closed")
  } catch {
    // ignore
  }
}

/**
 * Give a panel a collapsible header.
 *
 * `existingContent` lets a panel nominate an element that already holds its body (the Explorer's
 * `.explorer-content`); otherwise everything after the panel's heading is moved into a new wrapper.
 */
function makeCollapsible(
  panel: HTMLElement,
  key: string,
  label: string,
  defaultOpen: boolean,
  existingContent?: HTMLElement | null,
) {
  if (panel.dataset.collapsibleReady === "true") return
  panel.dataset.collapsibleReady = "true"

  let content: HTMLElement
  if (existingContent) {
    content = existingContent
    content.classList.add("panel-content")
  } else {
    const heading = panel.querySelector(":scope > h3")
    content = document.createElement("div")
    content.className = "panel-content"
    let node: ChildNode | null = heading ? heading.nextSibling : panel.firstChild
    while (node) {
      const next: ChildNode | null = node.nextSibling
      content.appendChild(node)
      node = next
    }
    heading?.remove()
    panel.append(content)
  }

  const button = document.createElement("button")
  button.type = "button"
  button.className = "title-button panel-toggle"
  const h3 = document.createElement("h3")
  h3.textContent = label
  button.append(h3, chevron())
  panel.prepend(button)

  const apply = (open: boolean) => {
    button.setAttribute("aria-expanded", String(open))
    panel.classList.toggle("panel-collapsed", !open)
  }

  apply(readState(key, defaultOpen))

  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true"
    apply(open)
    writeState(key, open)
  })
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

  const recent = group.querySelector(".recent-notes")
  if (recent instanceof HTMLElement) makeCollapsible(recent, "recent-notes", "Recent Notes", false)

  const explorer = group.querySelector(".explorer")
  if (explorer instanceof HTMLElement) {
    const content = explorer.querySelector(".explorer-content")
    makeCollapsible(
      explorer,
      "explorer",
      "Explorer",
      false,
      content instanceof HTMLElement ? content : null,
    )
  }

  const tags = group.querySelector(".tag-explorer")
  if (tags instanceof HTMLElement) makeCollapsible(tags, "tag-explorer", "Tag Explorer", false)
}

setup()
// Quartz's SPA router replaces the sidebar contents without a full page load.
document.addEventListener("nav", setup)
