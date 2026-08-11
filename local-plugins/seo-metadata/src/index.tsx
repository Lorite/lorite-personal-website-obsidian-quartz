import type { BuildCtx, QuartzTransformerPlugin } from "@quartz-community/types"

export interface SeoAffiliation {
  name: string
  url?: string
}

export interface SeoMetadataOptions {
  /**
   * Full name of the person this site is about. Empty string disables the Person/WebSite schema
   * entirely (the canonical link is unaffected).
   */
  personName: string
  /** Other spellings people search for, e.g. the name without the second surname. */
  alternateNames: string[]
  /** Free-text role, e.g. "Industrial PhD Student in Robotics". */
  jobTitle: string
  /** One-line summary of the person, used as the schema `description`. */
  personDescription: string
  /** Organisation the person belongs to. */
  affiliation: SeoAffiliation | null
  /**
   * Profile URLs that all describe the same person (Scholar, GitHub, LinkedIn, ORCID, ...).
   * This is the signal that tells Google those accounts and this site are one entity, so it is the
   * single most important option here.
   */
  sameAs: string[]
  /** Slugs that carry the Person schema. The homepage is the entity home, hence "index". */
  personSlugs: string[]
  /** Emit `<link rel="canonical">` on every page. */
  emitCanonical: boolean
}

const DEFAULTS: SeoMetadataOptions = {
  personName: "",
  alternateNames: [],
  jobTitle: "",
  personDescription: "",
  affiliation: null,
  sameAs: [],
  personSlugs: ["index"],
  emitCanonical: true,
}

/** `https://<baseUrl>` the way Quartz's own Head does it, so the two never disagree. */
function siteOrigin(ctx: BuildCtx): URL {
  return new URL(`https://${ctx.cfg.configuration.baseUrl ?? "example.com"}`)
}

/**
 * Absolute URL for a slug, matching what the site actually serves.
 *
 * Quartz slugs keep an explicit `index` segment (the homepage is `index`, a folder page is
 * `media/books/index`), but those are served at `/` and `/media/books/`. Emitting the raw slug would
 * point the canonical at `/index`, which 301s — a canonical must name the final URL, not a redirect.
 */
function absoluteUrl(origin: URL, slug: string): string {
  const trimmed = slug.replace(/(^|\/)index$/, "$1")
  return new URL(trimmed, origin).href
}

/** JSON-LD is injected as raw text, so `<` must not be able to close the script element. */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

/**
 * Adds the `<head>` metadata Quartz v5 has no core plugin for: a per-page canonical link and a
 * schema.org `Person` + `WebSite` graph on the homepage.
 *
 * Why this exists: for a personal site, ranking for your own name is an *entity* problem, not a
 * keyword one. Google has to be convinced that this domain, the Scholar profile, the GitHub account
 * and the university page are all the same human. `sameAs` is how you say that explicitly instead of
 * hoping it infers it.
 *
 * v5's Head is internal and cannot be forked, so this rides `externalResources().additionalHead`,
 * which Head.tsx renders (and calls with `fileData` when the entry is a function).
 */
const SeoMetadata: QuartzTransformerPlugin<Partial<SeoMetadataOptions>> = (opts) => {
  const cfg: SeoMetadataOptions = { ...DEFAULTS, ...(opts ?? {}) }

  return {
    name: "SeoMetadata",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds head tags.
    htmlPlugins() {
      return []
    },
    externalResources(ctx) {
      const origin = siteOrigin(ctx)
      const personSlugs = new Set(cfg.personSlugs)
      const additionalHead: unknown[] = []

      if (cfg.emitCanonical) {
        additionalHead.push((fileData: { slug?: string }) => {
          const slug = fileData.slug
          // The 404 page is served for arbitrary URLs, so it has no canonical of its own.
          if (!slug || slug === "404") return null
          return <link rel="canonical" href={absoluteUrl(origin, slug)} key="seo-canonical" />
        })
      }

      if (cfg.personName) {
        const personId = new URL("#person", origin).href
        const websiteId = new URL("#website", origin).href

        const person: Record<string, unknown> = {
          "@type": "Person",
          "@id": personId,
          name: cfg.personName,
          url: origin.href,
          mainEntityOfPage: origin.href,
        }
        if (cfg.alternateNames.length) person.alternateName = cfg.alternateNames
        if (cfg.jobTitle) person.jobTitle = cfg.jobTitle
        if (cfg.personDescription) person.description = cfg.personDescription
        if (cfg.affiliation) {
          person.affiliation = {
            "@type": "Organization",
            name: cfg.affiliation.name,
            ...(cfg.affiliation.url ? { url: cfg.affiliation.url } : {}),
          }
        }
        if (cfg.sameAs.length) person.sameAs = cfg.sameAs

        const graph = {
          "@context": "https://schema.org",
          "@graph": [
            person,
            {
              "@type": "WebSite",
              "@id": websiteId,
              url: origin.href,
              name: ctx.cfg.configuration.pageTitle ?? cfg.personName,
              author: { "@id": personId },
              publisher: { "@id": personId },
              inLanguage: ctx.cfg.configuration.locale ?? "en-US",
            },
          ],
        }
        const json = safeJsonLd(graph)

        additionalHead.push((fileData: { slug?: string }) => {
          if (!fileData.slug || !personSlugs.has(fileData.slug)) return null
          return (
            <script
              type="application/ld+json"
              key="seo-person-jsonld"
              dangerouslySetInnerHTML={{ __html: json }}
            />
          )
        })
      }

      return additionalHead.length ? { additionalHead } : {}
    },
  }
}

export default SeoMetadata
