import type { QuartzTransformerPlugin } from "@quartz-community/types"
import siteCss from "./site.css"

export interface SiteStylesOptions {
  /** Extra CSS appended after the bundled site stylesheet. */
  extraCss: string
}

/**
 * Injects site-wide CSS that doesn't belong to any single component — the v5 home for what used to
 * be the forked `quartz/styles/base.scss` in v4 (v5's core styles can't be forked).
 */
const SiteStyles: QuartzTransformerPlugin<Partial<SiteStylesOptions>> = (opts) => {
  const css = [siteCss, opts?.extraCss ?? ""].filter(Boolean).join("\n")

  return {
    name: "SiteStyles",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS.
    htmlPlugins() {
      return []
    },
    externalResources() {
      if (!css.trim()) return {}
      return {
        css: [{ content: css, inline: true, spaPreserve: true }],
      }
    },
  }
}

export default SiteStyles
