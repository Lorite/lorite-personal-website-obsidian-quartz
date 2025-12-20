import { FullSlug, resolveRelative, simplifySlug } from "../../util/path"

type MaybeHTMLElement = HTMLElement | undefined

interface TagNodeData {
  name: string
  displayName: string
  slug?: FullSlug
  isFile: boolean
  children: TagNodeData[]
}

type FolderState = {
  path: string
  collapsed: boolean
}

let currentExplorerState: Array<FolderState>

function toggleExplorer(this: HTMLElement) {
  const nearestExplorer = this.closest(".explorer") as HTMLElement
  if (!nearestExplorer) return
  const explorerCollapsed = nearestExplorer.classList.toggle("collapsed")
  nearestExplorer.setAttribute(
    "aria-expanded",
    nearestExplorer.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )

  if (!explorerCollapsed) {
    // Stop <html> from being scrollable when mobile explorer is open
    document.documentElement.classList.add("mobile-no-scroll")
  } else {
    document.documentElement.classList.remove("mobile-no-scroll")
  }
}

function toggleFolder(evt: MouseEvent) {
  evt.stopPropagation()
  const target = evt.target as MaybeHTMLElement
  if (!target) return

  // Check if target was svg icon or button
  const isSvg = target.nodeName === "svg"

  // corresponding <ul> element relative to clicked button/folder
  const folderContainer = (
    isSvg
      ? // svg -> div.folder-container
        target.parentElement
      : // button.folder-button -> div -> div.folder-container
        target.parentElement?.parentElement
  ) as MaybeHTMLElement
  if (!folderContainer) return
  const childFolderContainer = folderContainer.nextElementSibling as MaybeHTMLElement
  if (!childFolderContainer) return

  childFolderContainer.classList.toggle("open")

  // Collapse folder container
  const isCollapsed = !childFolderContainer.classList.contains("open")
  setFolderState(childFolderContainer, isCollapsed)

  const currentFolderState = currentExplorerState.find(
    (item) => item.path === folderContainer.dataset.folderpath,
  )
  if (currentFolderState) {
    currentFolderState.collapsed = isCollapsed
  } else {
    currentExplorerState.push({
      path: folderContainer.dataset.folderpath as FullSlug,
      collapsed: isCollapsed,
    })
  }

  const stringifiedFileTree = JSON.stringify(currentExplorerState)
  localStorage.setItem("tagExplorerTree", stringifiedFileTree)
}

function createFileNode(currentSlug: FullSlug, node: TagNodeData): HTMLLIElement {
  const template = document.getElementById("tag-template-file") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement
  if (node.slug) {
    a.href = resolveRelative(currentSlug, node.slug)
    a.dataset.for = node.slug
  }
  a.textContent = node.displayName

  if (currentSlug === node.slug) {
    a.classList.add("active")
  }

  return li
}

function createFolderNode(
  currentSlug: FullSlug,
  node: TagNodeData,
  folderClickBehavior: "collapse" | "link",
  folderPath: string,
  isCollapsed: boolean,
): HTMLLIElement {
  const template = document.getElementById("tag-template-folder") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const folderContainer = li.querySelector(".folder-container") as HTMLElement
  const titleContainer = folderContainer.querySelector("div") as HTMLElement
  const folderOuter = li.querySelector(".folder-outer") as HTMLElement
  const ul = folderOuter.querySelector("ul") as HTMLUListElement

  folderContainer.dataset.folderpath = folderPath

  // Tags should link to tag pages when behavior is "link"
  const tagSlug = `tags/${folderPath}` as FullSlug

  if (folderClickBehavior === "link") {
    const button = titleContainer.querySelector(".folder-button") as HTMLElement
    const a = document.createElement("a")
    a.href = resolveRelative(currentSlug, tagSlug)
    a.dataset.for = tagSlug
    a.className = "folder-title"
    a.textContent = node.displayName
    button.replaceWith(a)
  } else {
    const span = titleContainer.querySelector(".folder-title") as HTMLElement
    span.textContent = node.displayName
  }

  // if this folder is a prefix of the current path we want to open it anyways
  const simpleFolderPath = simplifySlug(folderPath as FullSlug)
  const folderIsPrefixOfCurrentSlug =
    simpleFolderPath === currentSlug.slice(0, simpleFolderPath.length)

  if (!isCollapsed || folderIsPrefixOfCurrentSlug) {
    folderOuter.classList.add("open")
  }

  for (const child of node.children) {
    const childPath = folderPath ? `${folderPath}/${child.name}` : child.name
    const childNode = child.isFile
      ? createFileNode(currentSlug, child)
      : createFolderNode(
          currentSlug,
          child,
          folderClickBehavior,
          childPath,
          currentExplorerState.find((item) => item.path === childPath)?.collapsed ?? isCollapsed,
        )
    ul.appendChild(childNode)
  }

  return li
}

async function setupTagExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.tag-explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const folderClickBehavior = (explorer.dataset.behavior || "link") as "collapse" | "link"
    const folderDefaultState = (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open"
    const useSavedState = explorer.dataset.savestate === "true"
    const treeData = JSON.parse(explorer.dataset.tree || "{}")

    // Get folder state from local storage
    const storageTree = localStorage.getItem("tagExplorerTree")
    const serializedExplorerState = storageTree && useSavedState ? JSON.parse(storageTree) : []
    
    currentExplorerState = serializedExplorerState

    const explorerUl = explorer.querySelector(".explorer-ul")
    if (!explorerUl) continue

    // Create and insert new content from the server-provided tree
    const fragment = document.createDocumentFragment()
    for (const child of treeData.children || []) {
      const isCollapsed =
        currentExplorerState.find((item) => item.path === child.name)?.collapsed ??
        folderDefaultState === "collapsed"
      
      const node = child.isFile
        ? createFileNode(currentSlug, child)
        : createFolderNode(currentSlug, child, folderClickBehavior, child.name, isCollapsed)

      fragment.appendChild(node)
    }
    explorerUl.insertBefore(fragment, explorerUl.firstChild)

    // restore explorer scrollTop position if it exists
    const scrollTop = sessionStorage.getItem("tagExplorerScrollTop")
    if (scrollTop) {
      explorerUl.scrollTop = parseInt(scrollTop)
    } else {
      // try to scroll to the active element if it exists
      const activeElement = explorerUl.querySelector(".active")
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth" })
      }
    }

    // Set up event handlers
    const explorerButtons = explorer.getElementsByClassName(
      "explorer-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of explorerButtons) {
      button.addEventListener("click", toggleExplorer)
      window.addCleanup(() => button.removeEventListener("click", toggleExplorer))
    }

    // Set up folder click handlers (collapse behavior)
    const folderButtons = explorer.getElementsByClassName(
      "folder-button",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of folderButtons) {
      button.addEventListener("click", toggleFolder)
      window.addCleanup(() => button.removeEventListener("click", toggleFolder))
    }

    const folderIcons = explorer.getElementsByClassName(
      "folder-icon",
    ) as HTMLCollectionOf<HTMLElement>
    for (const icon of folderIcons) {
      icon.addEventListener("click", toggleFolder)
      window.addCleanup(() => icon.removeEventListener("click", toggleFolder))
    }
  }
}

document.addEventListener("prenav", async () => {
  // save explorer scrollTop position
  const explorer = document.querySelector(".tag-explorer .explorer-ul")
  if (!explorer) return
  sessionStorage.setItem("tagExplorerScrollTop", explorer.scrollTop.toString())
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  await setupTagExplorer(currentSlug)

  // if mobile hamburger is visible, collapse by default
  for (const explorer of document.getElementsByClassName("tag-explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-explorer")
    if (!mobileExplorer) return

    if (mobileExplorer.checkVisibility()) {
      explorer.classList.add("collapsed")
      explorer.setAttribute("aria-expanded", "false")

      // Allow <html> to be scrollable when mobile explorer is collapsed
      document.documentElement.classList.remove("mobile-no-scroll")
    }

    mobileExplorer.classList.remove("hide-until-loaded")
  }
})

window.addEventListener("resize", function () {
  // Desktop explorer opens by default, and it stays open when the window is resized
  // to mobile screen size. Applies `no-scroll` to <html> in this edge case.
  const explorer = document.querySelector(".tag-explorer")
  if (explorer && !explorer.classList.contains("collapsed")) {
    document.documentElement.classList.add("mobile-no-scroll")
    return
  }
})

function setFolderState(folderElement: HTMLElement, collapsed: boolean) {
  return collapsed ? folderElement.classList.remove("open") : folderElement.classList.add("open")
}
