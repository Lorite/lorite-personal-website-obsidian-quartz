import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface IconFontsOptions {
  /** URL of the icon-font stylesheet to load. Set to "" to disable. */
  stylesheet: string
}

declare const IconFonts: QuartzTransformerPlugin<Partial<IconFontsOptions>>

export default IconFonts
