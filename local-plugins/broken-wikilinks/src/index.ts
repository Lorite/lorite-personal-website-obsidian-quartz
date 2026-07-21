import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface BrokenWikilinksOptions {
  /**
   * "remove" (default) unwraps the anchor and keeps its text — the Quartz v4 behaviour.
   * "keep" leaves the link alone (the community plugin's `broken` class still applies).
   */
  onBrokenWikilink: "remove" | "keep"
}

interface HastNode {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function hasBrokenClass(node: HastNode): boolean {
  const className = node.properties?.className
  if (Array.isArray(className)) return className.includes("broken")
  if (typeof className === "string") return className.split(/\s+/).includes("broken")
  return false
}

/**
 * Unwraps wikilinks that point at notes which don't exist.
 *
 * Quartz v4 had this built into a forked CrawlLinks as `onBrokenWikilink: "remove"`. The v5
 * community crawl-links plugin only offers `disableBrokenWikilinks`, which just adds a `broken`
 * CSS class — the <a href> stays, so the link is still clickable and still lands on a 404.
 *
 * This plugin runs after crawl-links and replaces every `a.broken` with its own children, so the
 * text survives but the dead link (and the crawlable href behind it) does not.
 *
 * Requires `disableBrokenWikilinks: true` on the crawl-links plugin, which is what marks them.
 */
const BrokenWikilinks: QuartzTransformerPlugin<Partial<BrokenWikilinksOptions>> = (opts) => {
  const action = opts?.onBrokenWikilink ?? "remove"

  return {
    name: "BrokenWikilinks",
    htmlPlugins() {
      if (action !== "remove") return []

      return [
        () => (tree: HastNode) => {
          const walk = (node: HastNode) => {
            if (!node.children) return
            const next: HastNode[] = []
            for (const child of node.children) {
              if (child.type === "element" && child.tagName === "a" && hasBrokenClass(child)) {
                // Drop the anchor, keep what it wrapped.
                next.push(...(child.children ?? []))
                continue
              }
              walk(child)
              next.push(child)
            }
            node.children = next
          }
          walk(tree)
        },
      ]
    },
  }
}

export default BrokenWikilinks
