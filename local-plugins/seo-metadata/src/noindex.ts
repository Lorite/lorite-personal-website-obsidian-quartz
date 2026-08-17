/**
 * The single definition of "this page should be hidden from search indexes".
 *
 * It lives in its own module because TWO plugins have to agree on it exactly:
 *
 *   - `seo-metadata` (transformer) emits `<meta name="robots" content="noindex, follow">`.
 *   - `seo-sitemap`  (emitter)     leaves the same pages out of `sitemap.xml`.
 *
 * If those two ever disagree, the site tells Google to index a URL via the sitemap while the page
 * itself says not to. Google reports that contradiction as the ERROR "Submitted URL marked
 * 'noindex'" in the Pages report — which is exactly the bug this module exists to make impossible.
 * That is not hypothetical: it is what shipped in `781bff4`, where the noindex landed without the
 * sitemap being taught about it.
 *
 * They cannot share a runtime import (each local plugin is bundled standalone by
 * scripts/build-local-plugins.ts), so `seo-sitemap` imports this file by relative path and esbuild
 * inlines it into both bundles. Same source, two copies of the compiled output — which is fine, and
 * is the point: the rule is edited in one place.
 */

/** Compile the configured regex sources once, so callers do not rebuild them per page. */
export function compileNoindexPatterns(sources: string[]): RegExp[] {
  return sources.map((p) => new RegExp(p))
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
export function isNoindexed(
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
