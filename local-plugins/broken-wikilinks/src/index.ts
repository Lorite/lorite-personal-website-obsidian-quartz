import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface BrokenWikilinksOptions {
  /**
   * "remove" (default) unwraps the anchor and keeps its text — the Quartz v4 behaviour.
   * "keep" leaves the link alone (the community plugin's `broken` class still applies).
   */
  onBrokenWikilink: "remove" | "keep"
  /**
   * Slug prefixes to treat as valid even when crawl-links marks them broken. These point at things
   * that genuinely exist but aren't content slugs, so the crawler can't see them.
   */
  keepSlugPrefixes: string[]
  /** Anchor classes that are never unwrapped, whatever crawl-links decided. */
  keepClasses: string[]
}

const DEFAULT_KEEP_SLUG_PREFIXES = ["static/"]
// Tag pages are emitted by the tag-page plugin, but hierarchical tag slugs aren't in ctx.allSlugs
// when crawl-links runs, so it flags them broken even though the pages exist.
const DEFAULT_KEEP_CLASSES = ["tag-link"]

interface HastNode {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function classList(node: HastNode): string[] {
  const className = node.properties?.className
  if (Array.isArray(className)) return className.map(String)
  if (typeof className === "string") return className.split(/\s+/)
  return []
}

function hasBrokenClass(node: HastNode): boolean {
  return classList(node).includes("broken")
}

/**
 * Unwraps wikilinks that point at notes which don't exist.
 *
 * Quartz v4 had this built into a forked CrawlLinks as `onBrokenWikilink: "remove"`. The v5
 * community crawl-links plugin only offers `disableBrokenWikilinks`, which just adds a `broken`
 * CSS class — the <a href> stays, so the link is still clickable and still lands on a 404.
 *
 * This plugin runs after crawl-links and replaces a broken `a` with its own children, so the text
 * survives but the dead link (and the crawlable href behind it) does not.
 *
 * IMPORTANT: crawl-links' `broken` class is broader than "wikilink to a missing note" — it flags
 * anything whose slug isn't in `ctx.allSlugs`, which includes links that are perfectly valid:
 *   - static assets (e.g. `static/slides/...`), emitted by the Static plugin, not content slugs
 *   - tag pages, whose hierarchical slugs aren't registered when crawl-links runs
 * Unwrapping those silently broke real links, so both are skipped by default. The v4 fork avoided
 * the same trap by ignoring hrefs starting with "/" or ".".
 *
 * Requires `disableBrokenWikilinks: true` on the crawl-links plugin, which is what marks them.
 */
const BrokenWikilinks: QuartzTransformerPlugin<Partial<BrokenWikilinksOptions>> = (opts) => {
  const action = opts?.onBrokenWikilink ?? "remove"
  const keepSlugPrefixes = opts?.keepSlugPrefixes ?? DEFAULT_KEEP_SLUG_PREFIXES
  const keepClasses = opts?.keepClasses ?? DEFAULT_KEEP_CLASSES

  const shouldUnwrap = (node: HastNode): boolean => {
    if (!hasBrokenClass(node)) return false

    const classes = classList(node)
    if (keepClasses.some((c) => classes.includes(c))) return false

    const slug = node.properties?.["data-slug"]
    if (typeof slug === "string" && keepSlugPrefixes.some((p) => slug.startsWith(p))) return false

    return true
  }

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
                if (shouldUnwrap(child)) {
                  // Drop the anchor, keep what it wrapped.
                  next.push(...(child.children ?? []))
                  continue
                }
                // Kept on purpose (tag page / static asset): also drop the `broken` class, or the
                // stylesheet renders these perfectly good links at 50% opacity as if they were dead.
                if (child.properties) {
                  child.properties.className = classList(child).filter((c) => c !== "broken")
                }
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
