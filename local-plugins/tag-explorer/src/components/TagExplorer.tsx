import type { QuartzComponent, QuartzComponentProps } from "@quartz-community/types"
import { classNames, resolveRelative } from "@quartz-community/utils"
import styles from "./tagExplorer.css"

export interface TagExplorerOptions {
  title: string
  /** Whether nested tag groups start collapsed or open. */
  defaultState: "collapsed" | "open"
  /** Show the number of notes carrying each tag (parents include their descendants). */
  showCount: boolean
  sortBy: "name" | "count"
  /** Tags to hide entirely, e.g. bookkeeping tags like "collection-index". */
  exclude: string[]
}

const DEFAULT_OPTS: TagExplorerOptions = {
  title: "Tag Explorer",
  defaultState: "collapsed",
  showCount: true,
  sortBy: "name",
  exclude: [],
}

interface TagNode {
  segment: string
  /** Full hierarchical tag, e.g. "media/movies". */
  fullTag: string
  /** Notes carrying exactly this tag. */
  own: number
  /** Notes carrying this tag or any descendant of it. */
  total: number
  children: Map<string, TagNode>
}

function makeNode(segment: string, fullTag: string): TagNode {
  return { segment, fullTag, own: 0, total: 0, children: new Map() }
}

/**
 * Build the tag hierarchy from every published file's frontmatter tags.
 * Quartz treats "/" as a tag hierarchy separator, so "media/movies" nests under "media".
 */
function buildTagTree(allFiles: QuartzComponentProps["allFiles"], exclude: Set<string>): TagNode {
  const root = makeNode("", "")

  for (const file of allFiles) {
    const frontmatter = file?.frontmatter as { tags?: unknown } | undefined
    const rawTags = frontmatter?.tags
    if (!Array.isArray(rawTags)) continue

    // A note tagged both "media" and "media/movies" should only count once per node.
    const seen = new Set<string>()

    for (const raw of rawTags) {
      const tag = String(raw).trim()
      if (!tag || exclude.has(tag)) continue

      const segments = tag.split("/").filter(Boolean)
      if (segments.length === 0) continue

      let node = root
      const acc: string[] = []
      for (const segment of segments) {
        acc.push(segment)
        const fullTag = acc.join("/")
        let child = node.children.get(segment)
        if (!child) {
          child = makeNode(segment, fullTag)
          node.children.set(segment, child)
        }
        if (!seen.has(fullTag)) {
          seen.add(fullTag)
          child.total += 1
        }
        node = child
      }
      node.own += 1
    }
  }

  return root
}

function sortChildren(node: TagNode, sortBy: TagExplorerOptions["sortBy"]): TagNode[] {
  const children = Array.from(node.children.values())
  children.sort((a, b) => {
    if (sortBy === "count" && a.total !== b.total) return b.total - a.total
    return a.segment.localeCompare(b.segment, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  })
  return children
}

export const TagExplorer = (userOpts?: Partial<TagExplorerOptions>): QuartzComponent => {
  const opts: TagExplorerOptions = { ...DEFAULT_OPTS, ...userOpts }
  const exclude = new Set(opts.exclude)

  const Component: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
  }: QuartzComponentProps) => {
    const root = buildTagTree(allFiles ?? [], exclude)
    const topLevel = sortChildren(root, opts.sortBy)
    if (topLevel.length === 0) return null

    const currentSlug = fileData?.slug as string

    const renderNode = (node: TagNode) => {
      const children = sortChildren(node, opts.sortBy)
      const href = resolveRelative(currentSlug as never, `tags/${node.fullTag}` as never)
      const label = (
        <>
          <a href={href} class="internal tag-link">
            {node.segment}
          </a>
          {opts.showCount ? <span class="tag-count">{node.total}</span> : null}
        </>
      )

      // Native <details> gives collapsing with no client-side JS, so this survives SPA navigation.
      if (children.length === 0) {
        return <li class="tag-leaf">{label}</li>
      }

      return (
        <li class="tag-branch">
          <details open={opts.defaultState === "open"}>
            <summary>{label}</summary>
            <ul>{children.map(renderNode)}</ul>
          </details>
        </li>
      )
    }

    return (
      <div class={classNames(displayClass, "tag-explorer")}>
        <h3>{opts.title}</h3>
        <ul class="tag-explorer-list">{topLevel.map(renderNode)}</ul>
      </div>
    )
  }

  Component.css = styles
  return Component
}

export default TagExplorer
