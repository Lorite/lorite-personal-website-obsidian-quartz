/**
 * Turns the three left-sidebar panels (Recent Notes, Explorer, Tag Explorer) into one panel with
 * collapsible sections that look and behave identically.
 *
 * They're placed in a single Quartz layout group (see the `sidebar-panels` group in
 * quartz.config.yaml), which renders them inside one `.flex-component` container. That container
 * gets a `sidebar-panels` class here so the CSS can style it as a single bordered panel.
 *
 * Behaviour: an accordion — at most one section is expanded at a time, and the other two always
 * remain visible as their collapsed headers. Clicking the open section closes it, leaving all three
 * collapsed (which is also the default on a first visit). The choice is remembered in localStorage.
 *
 * All three sections get the same generated header. The Explorer ships its own toggle
 * (`button.explorer-toggle` around an <h2>), but inside this panel it doesn't work — its handler
 * never updates `aria-expanded` — and its <h2> looks nothing like the other sections' <h3>. So its
 * native toggles are hidden (via CSS) and it gets the shared header, using its existing
 * `.explorer-content` as the collapsible body.
 */

/** Key of the single expanded section, or "" when all are collapsed. */
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
    // localStorage can throw in private mode; default to all collapsed.
    return ""
  }
}

function writeOpenKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // ignore
  }
}

/**
 * Give a panel a collapsible header and return it as a section.
 *
 * `existingContent` lets a panel nominate an element that already holds its body (the Explorer's
 * `.explorer-content`); otherwise everything after the panel's heading is moved into a new wrapper.
 */
function buildSection(
  panel: HTMLElement,
  key: string,
  label: string,
  existingContent?: HTMLElement | null,
): Section | null {
  if (panel.dataset.collapsibleReady === "true") {
    const existing = panel.querySelector(":scope > .panel-toggle")
    return existing instanceof HTMLButtonElement ? { key, panel, button: existing } : null
  }
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

  const recent = group.querySelector(".recent-notes")
  if (recent instanceof HTMLElement) {
    const section = buildSection(recent, "recent-notes", "Recent Notes")
    if (section) sections.push(section)
  }

  const explorer = group.querySelector(".explorer")
  if (explorer instanceof HTMLElement) {
    const content = explorer.querySelector(".explorer-content")
    const section = buildSection(
      explorer,
      "explorer",
      "Explorer",
      content instanceof HTMLElement ? content : null,
    )
    if (section) sections.push(section)
  }

  const tags = group.querySelector(".tag-explorer")
  if (tags instanceof HTMLElement) {
    const section = buildSection(tags, "tag-explorer", "Tag Explorer")
    if (section) sections.push(section)
  }

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
    // Re-binding on SPA nav is harmless for fresh DOM, but guard in case the node is reused.
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

/**
 * Safety net for an upstream Explorer race.
 *
 * The community Explorer builds its file tree entirely client-side, and its nav handler (`L` in the
 * plugin) is bound to BOTH the `nav` and `render` events, which fire close together. It clears the
 * list, does an async `await` to fetch/build the tree, then renders ONLY if no newer event fired in
 * the meantime (`if (e === b)`). When two events overlap, the superseded one has already cleared the
 * list and then skips rendering — so the Explorer intermittently shows no folders.
 *
 * We can't patch the plugin's minified code, but we can notice the empty result and re-trigger it:
 * an empty populated tree is a `.explorer-ul` containing only its `.overflow-end` sentinel. If that's
 * the case a moment after navigation, dispatch a fresh `render` event (which the Explorer listens to
 * but this script does not, so no recursion here) to rebuild, retrying a few times with backoff.
 */
function explorerIsEmpty(): boolean {
  const ul = document.querySelector(".left.sidebar .explorer .explorer-ul")
  if (!ul) return false // no explorer on this page → nothing to fix
  return ul.querySelector(".folder-container, .nav-file-title, .nav-folder-title") === null
}

function ensureExplorerPopulated(attempt = 0) {
  const maxAttempts = 4
  window.setTimeout(
    () => {
      if (!explorerIsEmpty()) return
      if (attempt >= maxAttempts) return
      // Re-run the Explorer's own nav/render handler to rebuild the tree.
      document.dispatchEvent(new CustomEvent("render"))
      ensureExplorerPopulated(attempt + 1)
    },
    250 + attempt * 250,
  )
}

setup()
ensureExplorerPopulated()

// Quartz's SPA router replaces the sidebar contents without a full page load.
document.addEventListener("nav", () => {
  setup()
  ensureExplorerPopulated()
})
