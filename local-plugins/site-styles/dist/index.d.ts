import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface SiteStylesOptions {
  /** Extra CSS appended after the bundled site stylesheet. */
  extraCss: string
}

declare const SiteStyles: QuartzTransformerPlugin<Partial<SiteStylesOptions>>

export default SiteStyles
