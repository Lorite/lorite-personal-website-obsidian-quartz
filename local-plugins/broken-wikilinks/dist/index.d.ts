import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface BrokenWikilinksOptions {
  /** "remove" (default) unwraps the anchor and keeps its text; "keep" leaves it alone. */
  onBrokenWikilink: "remove" | "keep"
}

declare const BrokenWikilinks: QuartzTransformerPlugin<Partial<BrokenWikilinksOptions>>

export default BrokenWikilinks
