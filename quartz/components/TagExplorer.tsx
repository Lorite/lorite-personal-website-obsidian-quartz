import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import explorerStyle from "./styles/explorer.scss"

// @ts-ignore
import script from "./scripts/tagexplorer.inline"
import { TagNode, Options } from "./TagExplorerNode"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

// Options interface defined in `TagExplorerNode` to avoid circular dependency
const defaultOptions = {
  folderClickBehavior: "link",
  folderDefaultState: "collapsed",
  useSavedState: true,
  mapFn: (node: TagNode) => {
    return node
  },
  sortFn: (a: TagNode, b: TagNode) => {
    // Sort order: folders first, then files. Sort folders and files alphabetically
    if ((!a.file && !b.file) || (a.file && b.file)) {
      // numeric: true: Whether numeric collation should be used, such that "1" < "2" < "10"
      // sensitivity: "base": Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    if (a.file && !b.file) {
      return 1
    } else {
      return -1
    }
  },
  filterFn: (node: TagNode) => node.name !== "tags",
  order: ["filter", "map", "sort"],
} satisfies Options

let numExplorers = 0
export default ((userOpts?: Partial<Options>) => {
  // Parse config
  const opts: Options = { ...defaultOptions, ...userOpts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  // memoized
  let fileTree: TagNode

  function constructFileTree(allFiles: any[]) {
    if (fileTree) {
      return
    }

    // Construct tree from allFiles - only include files that have tags
    fileTree = new TagNode("")
    allFiles.forEach((file) => {
      if (file.frontmatter?.tags && file.frontmatter.tags.length > 0) {
        fileTree.add(file)
      }
    })

    // Execute all functions (sort, filter, map) that were provided (if none were provided, only default "sort" is applied)
    if (opts.order) {
      // Order is important, use loop with index instead of order.map()
      for (let i = 0; i < opts.order.length; i++) {
        const functionName = opts.order[i]
        if (functionName === "map") {
          fileTree.map(opts.mapFn)
        } else if (functionName === "sort") {
          fileTree.sort(opts.sortFn)
        } else if (functionName === "filter") {
          fileTree.filter(opts.filterFn)
        }
      }
    }
  }

  const TagExplorer: QuartzComponent = ({ cfg, allFiles, displayClass }: QuartzComponentProps) => {
    constructFileTree(allFiles)
    const id = `explorer-${numExplorers++}`

    // Serialize the tag tree to pass to client-side script
    const serializeTree = (node: TagNode): any => {
      return {
        name: node.name,
        displayName: node.displayName,
        slug: node.file ? node.file.slug : undefined,
        isFile: !!node.file,
        children: node.children.map(serializeTree),
      }
    }

    const serializedTree = JSON.stringify(serializeTree(fileTree))

    return (
      <div
        class={classNames(displayClass, "explorer", "tag-explorer")}
        data-behavior={opts.folderClickBehavior}
        data-collapsed={opts.folderDefaultState}
        data-savestate={opts.useSavedState}
        data-tree={serializedTree}
      >
        <button
          type="button"
          class="explorer-toggle mobile-explorer hide-until-loaded"
          data-mobile={true}
          aria-controls={id}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-menu"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="title-button explorer-toggle desktop-explorer"
          data-mobile={false}
          aria-expanded={true}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="explorer-content" aria-expanded={false} role="group">
          <OverflowList class="explorer-ul" />
        </div>
        <template id="tag-template-file">
          <li>
            <a href="#"></a>
          </li>
        </template>
        <template id="tag-template-folder">
          <li>
            <div class="folder-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="5 8 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="folder-icon"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <div>
                <button class="folder-button">
                  <span class="folder-title"></span>
                </button>
              </div>
            </div>
            <div class="folder-outer">
              <ul class="content"></ul>
            </div>
          </li>
        </template>
      </div>
    )
  }

  TagExplorer.css = explorerStyle
  TagExplorer.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)
  return TagExplorer
}) satisfies QuartzComponentConstructor
