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
 * The community Explorer builds its file tree entirely client-side, and its handler (`L` in the
 * plugin) is bound to BOTH the `nav` and `render` events, which fire close together. It clears the
 * `.explorer-ul`, `await`s an async fetch/build, then renders ONLY if no newer event fired in the
 * meantime (`if (e === b)`). When two events overlap, the superseded invocation has already cleared
 * the list and then skips rendering — leaving the Explorer empty. On a large content index the build
 * is slow (hundreds of ms to seconds), which widens the window and makes this reliably reproducible.
 *
 * We can't patch the plugin's minified code. The naive fix — poll and re-dispatch on a short timer —
 * backfires: a re-dispatch fired while the (slow) build is still in flight supersedes it and keeps it
 * empty. So instead we watch the Explorer's OWN status logging to tell a stuck render (it logged a
 * skip / empty result) from a slow one still in progress, and only re-dispatch when it's genuinely
 * stuck. A generous timer is kept as a fallback in case the plugin's log strings change.
 *
 * Re-dispatching `render` (which the Explorer listens to but this script does not) avoids recursion,
 * and produces correct hrefs — only the per-page "active" highlight is skipped on a healed render.
 */
type ExplorerStatus = "" | "ok" | "stuck"
let explorerStatus: ExplorerStatus = ""
const EXPLORER_OK = /Render complete/
const EXPLORER_STUCK = /skipping tree render|No trie or empty children|No data received|No content/

// Observe the Explorer's own [Explorer] console messages to classify the last render outcome.
;(function hookConsoleForExplorer() {
  const methods = ["log", "warn", "error"] as const
  for (const method of methods) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => {
      const first = args[0]
      if (typeof first === "string" && first.includes("[Explorer]")) {
        if (EXPLORER_OK.test(first)) explorerStatus = "ok"
        else if (EXPLORER_STUCK.test(first)) explorerStatus = "stuck"
      }
      original(...args)
    }
  }
})()

function explorerIsEmpty(): boolean {
  const ul = document.querySelector(".left.sidebar .explorer .explorer-ul")
  if (!ul) return false // no explorer on this page → nothing to fix
  return ul.querySelector(".folder-container, .nav-file-title, .nav-folder-title") === null
}

// Each nav starts a fresh healing cycle; older cycles stop when the token changes.
let healToken = 0

function healExplorer() {
  const token = ++healToken
  const maxDispatches = 3
  const graceMs = 4000 // if the plugin's logs ever change, still heal after this long empty
  let dispatches = 0
  let elapsed = 0
  const stepMs = 300

  const tick = () => {
    if (token !== healToken) return // superseded by a newer navigation
    if (!explorerIsEmpty()) return // populated → healthy, done
    if (explorerStatus === "ok") return // plugin says it rendered; not our problem to fix

    const stuck = explorerStatus === "stuck" || elapsed >= graceMs
    if (stuck && dispatches < maxDispatches) {
      dispatches += 1
      explorerStatus = "" // watch the outcome of the render we're about to trigger
      document.dispatchEvent(new CustomEvent("render"))
    }

    if (dispatches >= maxDispatches) return
    elapsed += stepMs
    window.setTimeout(tick, stepMs)
  }

  window.setTimeout(tick, stepMs)
}

setup()
healExplorer()

// Quartz's SPA router replaces the sidebar contents without a full page load.
document.addEventListener("nav", () => {
  setup()
  healExplorer()
})
