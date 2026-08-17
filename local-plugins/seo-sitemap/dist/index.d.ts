import type { QuartzEmitterPlugin } from "@quartz-community/types"

export interface SeoSitemapOptions {
  noindexPatterns: string[]
  noindexMinWords: number
}

declare const SeoSitemap: QuartzEmitterPlugin<Partial<SeoSitemapOptions>>
export default SeoSitemap
