import type { QuartzComponent } from "@quartz-community/types"

export interface ExternalUrlOptions {
  /** Frontmatter field holding the source link. */
  field: string
  /** Link text. */
  label: string
}

export declare const ExternalUrl: (userOpts?: Partial<ExternalUrlOptions>) => QuartzComponent

export default ExternalUrl
