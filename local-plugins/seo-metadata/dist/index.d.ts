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
  profilePageSlugs: string[]
  emitCanonical: boolean
  noindexPatterns: string[]
  noindexMinWords: number
}

declare const SeoMetadata: QuartzTransformerPlugin<Partial<SeoMetadataOptions>>

export default SeoMetadata
