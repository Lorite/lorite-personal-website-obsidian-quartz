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
  /**
   * Slugs that are a biography/about page for `personName`, emitted as schema.org `ProfilePage`
   * with the Person as `mainEntity`. Google names "an 'About Me' page" as a valid use.
   *
   * Does nothing for indexing — Google is explicit that structured data does not affect it. This
   * exists so the one page that actually is the person's biography says so machine-readably, which
   * is the thing that matters for a name query.
   */
  profilePageSlugs: string[]
  /** Emit `<link rel="canonical">` on every page. */
  emitCanonical: boolean
  /**
   * Regex sources matching auto-generated listing pages (folder and tag indexes).
   *
   * Quartz emits one of these per folder and per tag, and they carry no prose of their own — the
   * links live in the page chrome, so the `<article>` is literally empty. They made up 64 of the
   * 97 URLs in the sitemap, which means two thirds of what Google was asked to look at was
   * near-identical boilerplate. Empty by default: this only does something once configured.
   */
  noindexPatterns: string[]
  /**
   * A page matching `noindexPatterns` is only marked noindex if its rendered text is shorter than
   * this. The check is on rendered text, not authored prose, so it spares two kinds of page: a
   * folder note someone actually wrote into, and a Bases-backed folder page that renders a
   * populated table. Both show a reader something; a bare folder index shows nothing.
   *
   * Consequence worth knowing before tuning this number: whether a listing page survives depends on
   * how much its table happens to render, so two structurally identical folders can land on
   * opposite sides of the threshold (`media/videogames/pokemon/` survives at 66 words while
   * `media/books/` is hidden at 0). That is acceptable here — the surviving pages are exactly the
   * ones with content on them — but it is not the same thing as "hand-written pages are safe".
   */
  noindexMinWords: number
}

const DEFAULTS: SeoMetadataOptions = {
  personName: "",
  alternateNames: [],
  jobTitle: "",
  personDescription: "",
  affiliation: null,
  sameAs: [],
  personSlugs: ["index"],
  profilePageSlugs: [],
  emitCanonical: true,
  noindexPatterns: [],
  noindexMinWords: 25,
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

/**
 * Should this page be hidden from search indexes?
 *
 * Two conditions, both required: the slug looks like an auto-generated listing page, and the page
 * renders almost no text. The word check is the important half — without it this would also hide
 * folder pages that do show something, whether authored prose or a populated Bases table.
 *
 * The homepage is never matched: its slug is the bare `index`, while folder pages are `<dir>/index`,
 * so a pattern anchored on `/index` cannot reach it. The 404 page is excluded explicitly.
 */
function isNoindexed(
  slug: string,
  text: string | undefined,
  patterns: RegExp[],
  minWords: number,
): boolean {
  if (slug === "404") return false
  if (!patterns.some((re) => re.test(slug))) return false
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length
  return words < minWords
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
      const noindexPatterns = cfg.noindexPatterns.map((p) => new RegExp(p))

      if (noindexPatterns.length) {
        additionalHead.push((fileData: { slug?: string; text?: string }) => {
          const slug = fileData.slug
          if (!slug) return null
          if (!isNoindexed(slug, fileData.text, noindexPatterns, cfg.noindexMinWords)) return null
          // "follow" is deliberate: these pages are worthless as search results but they are still
          // how the crawler walks to the notes underneath them, so link discovery must survive.
          return <meta name="robots" content="noindex, follow" key="seo-noindex" />
        })
      }

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

        // A ProfilePage declaration for the biography page. Google lists "an 'About Me' page" as a
        // valid use, and the only required property is `mainEntity` naming the Person.
        //
        // The Person is repeated inline rather than referenced by bare `@id`. Cross-document `@id`
        // resolution is not something Google promises, so a lone pointer to the homepage's node
        // risks saying nothing at all; repeating it makes this page a self-contained statement of
        // who it is about. That is not the same as the duplicate-entity problem the homepage-only
        // `personSlugs` rule avoids — this is one page declaring its subject, not a second site-wide
        // entity home, and `@id` still unifies the two nodes into one entity.
        //
        // Worth being blunt in the source: this does NOT make the page more likely to be indexed.
        // Google states structured data does not affect indexing. It is an entity-understanding
        // signal, which is the point for a name query, and nothing more.
        if (cfg.profilePageSlugs.length) {
          const profileSlugs = new Set(cfg.profilePageSlugs)
          additionalHead.push((fileData: { slug?: string }) => {
            const slug = fileData.slug
            if (!slug || !profileSlugs.has(slug)) return null
            const pageUrl = absoluteUrl(origin, slug)
            const profile = {
              "@context": "https://schema.org",
              "@type": "ProfilePage",
              "@id": `${pageUrl}#profilepage`,
              url: pageUrl,
              // `person` is reused verbatim, `mainEntityOfPage` included. It deliberately still
              // points at the homepage: the two nodes share an `@id`, so overriding it here would
              // have one entity asserting two different canonical pages for itself.
              mainEntity: person,
            }
            return (
              <script
                type="application/ld+json"
                key="seo-profilepage-jsonld"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(profile) }}
              />
            )
          })
        }
      }

      return additionalHead.length ? { additionalHead } : {}
    },
  }
}

export default SeoMetadata
