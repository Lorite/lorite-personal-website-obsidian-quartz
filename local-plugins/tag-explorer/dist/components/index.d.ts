import type { QuartzComponent } from "@quartz-community/types"

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

export declare const TagExplorer: (userOpts?: Partial<TagExplorerOptions>) => QuartzComponent

export default TagExplorer
