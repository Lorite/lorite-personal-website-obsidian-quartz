import type { BuildCtx, ProcessedContent, QuartzEmitterPlugin } from "@quartz-community/types"
import fs from "node:fs"
import path from "node:path"
// The rule is defined once, next to the transformer that writes the matching <meta> tag.
import { compileNoindexPatterns, isNoindexed } from "../../seo-metadata/src/noindex"

export interface SeoSitemapOptions {
  /**
   * Regex sources for auto-generated listing pages. MUST match `seo-metadata.noindexPatterns`.
   */
  noindexPatterns: string[]
  /** Word threshold for the same rule. MUST match `seo-metadata.noindexMinWords`. */
  noindexMinWords: number
}

const DEFAULTS: SeoSitemapOptions = {
  noindexPatterns: [],
  noindexMinWords: 25,
}

/**
 * Absolute URL for a slug, matching what the site actually serves.
 *
 * Quartz slugs keep an explicit `index` segment (the homepage is `index`, a folder page is
 * `media/books/index`) but those are served at `/` and `/media/books/`. A sitemap must list the URL
 * that answers 200, not one that 301s, so the trailing segment is stripped exactly as the canonical
 * link in `seo-metadata` does it.
 */
function absoluteUrl(origin: URL, slug: string): string {
  const trimmed = slug.replace(/(^|\/)index$/, "$1")
  return new URL(trimmed, origin).href
}

/** Quartz stores dates on `file.data`; fall back to build time as the upstream emitter does. */
function pageDate(data: Record<string, unknown>): Date {
  const dates = data.dates as Record<string, Date> | undefined
  return dates?.modified ?? dates?.published ?? dates?.created ?? new Date()
}

/**
 * Emits `sitemap.xml` containing only the pages that are actually allowed to be indexed.
 *
 * Replaces the sitemap from `github:quartz-community/content-index`, which must be turned off with
 * `enableSiteMap: false` or both plugins write the same file and the winner is load-order luck.
 *
 * Why a separate plugin rather than folding this into `seo-metadata`: the loader classifies a plugin
 * instance by shape and returns ONE category, with `emit` taking precedence over the transformer
 * hooks (quartz/plugins/loader/index.ts). Adding `emit` to `seo-metadata` would have silently
 * reclassified it as an emitter and dropped its canonical, JSON-LD and noindex tags entirely.
 *
 * Why not reuse the upstream `unlisted` escape hatch instead: content-index skips `data.unlisted`
 * pages before building `linkIndex`, but that same map also becomes `contentIndex.json`, which feeds
 * on-site search, link popovers and the graph. Hiding a page from the sitemap that way would also
 * delete it from search — the same trap as `includeEmptyFiles: false`.
 */
const SeoSitemap: QuartzEmitterPlugin<Partial<SeoSitemapOptions>> = (opts) => {
  const cfg: SeoSitemapOptions = { ...DEFAULTS, ...(opts ?? {}) }

  return {
    name: "SeoSitemap",
    async emit(ctx: BuildCtx, content: ProcessedContent[]) {
      const origin = new URL(`https://${ctx.cfg.configuration.baseUrl ?? "example.com"}`)
      const patterns = compileNoindexPatterns(cfg.noindexPatterns)

      const entries: string[] = []
      for (const [, file] of content) {
        const data = (file.data ?? {}) as Record<string, unknown>
        const slug = data.slug as string | undefined
        if (!slug) continue
        // A sitemap is a list of pages worth indexing, so everything the site tells crawlers to skip
        // is excluded here too: noindexed listing pages, the 404, and anything already unlisted.
        if (slug === "404") continue
        if (data.unlisted === true) continue
        if (isNoindexed(slug, data.text as string | undefined, patterns, cfg.noindexMinWords)) {
          continue
        }
        const loc = absoluteUrl(origin, slug)
        const lastmod = pageDate(data).toISOString()
        entries.push(`<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`
      const out = path.join(ctx.argv.output, "sitemap.xml")
      await fs.promises.mkdir(path.dirname(out), { recursive: true })
      await fs.promises.writeFile(out, xml)
      return [out as never]
    },
    async partialEmit() {
      return null
    },
  }
}

export default SeoSitemap
