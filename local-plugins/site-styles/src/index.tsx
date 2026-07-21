import type { QuartzTransformerPlugin } from "@quartz-community/types"
import siteCss from "./site.css"

export interface SiteStylesOptions {
  /** Extra CSS appended after the bundled site stylesheet. */
  extraCss: string
  /**
   * Value for a site-wide `<meta name="author">`. v4 added this in its forked Head.tsx
   * (commit a9747ff); v5's Head is internal, so it's contributed here instead.
   * Set to "" to omit the tag.
   */
  author: string
}

/**
 * Injects site-wide CSS and `<head>` tweaks that don't belong to any single component — the v5 home
 * for what used to be the forked `quartz/styles/base.scss` and `Head.tsx` in v4 (v5's core styles
 * and Head can't be forked).
 */
const SiteStyles: QuartzTransformerPlugin<Partial<SiteStylesOptions>> = (opts) => {
  const css = [siteCss, opts?.extraCss ?? ""].filter(Boolean).join("\n")
  const author = opts?.author ?? ""

  return {
    name: "SiteStyles",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds resources.
    htmlPlugins() {
      return []
    },
    externalResources() {
      const resources: Record<string, unknown> = {}
      if (css.trim()) {
        resources.css = [{ content: css, inline: true, spaPreserve: true }]
      }
      if (author) {
        resources.additionalHead = [<meta name="author" content={author} key="site-author" />]
      }
      return resources
    },
  }
}

export default SiteStyles
