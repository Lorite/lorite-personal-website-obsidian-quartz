import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface SeoAffiliation {
  name: string
  url?: string
}

export interface SeoMetadataOptions {
  personName: string
  alternateNames: string[]
  jobTitle: string
  personDescription: string
  affiliation: SeoAffiliation | null
  sameAs: string[]
  personSlugs: string[]
  emitCanonical: boolean
}

declare const SeoMetadata: QuartzTransformerPlugin<Partial<SeoMetadataOptions>>

export default SeoMetadata
