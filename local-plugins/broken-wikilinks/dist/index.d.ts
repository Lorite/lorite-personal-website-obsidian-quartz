import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface BrokenWikilinksOptions {
  /** "remove" (default) unwraps the anchor and keeps its text; "keep" leaves it alone. */
  onBrokenWikilink: "remove" | "keep"
  /** Slug prefixes treated as valid even when crawl-links marks them broken (default: ["static/"]). */
  keepSlugPrefixes: string[]
  /** Anchor classes that are never unwrapped (default: ["tag-link"]). */
  keepClasses: string[]
}

declare const BrokenWikilinks: QuartzTransformerPlugin<Partial<BrokenWikilinksOptions>>

export default BrokenWikilinks
