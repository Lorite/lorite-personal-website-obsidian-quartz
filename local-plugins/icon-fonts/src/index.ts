import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface IconFontsOptions {
  /**
   * URL of the icon-font stylesheet to load. In Quartz v4 this was a <link> in the forked
   * Head.tsx; v5's Head is internal, so it's contributed as an external CSS resource instead.
   * Set to "" to disable.
   */
  stylesheet: string
}

const DEFAULT_STYLESHEET =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"

/**
 * Makes icon classes (e.g. `fa-brands fa-github`) available site-wide — used by the site-footer
 * component's link icons.
 *
 * This is a separate plugin from site-footer because Quartz v5 only registers a plugin's components
 * when it declares no processing category (see config-loader.ts), so a combined
 * transformer+component plugin would have its component silently dropped.
 */
const IconFonts: QuartzTransformerPlugin<Partial<IconFontsOptions>> = (opts) => {
  const stylesheet = opts?.stylesheet ?? DEFAULT_STYLESHEET

  return {
    name: "IconFonts",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS.
    htmlPlugins() {
      return []
    },
    externalResources() {
      if (!stylesheet) return {}
      return {
        css: [{ content: stylesheet, inline: false, spaPreserve: true }],
      }
    },
  }
}

export default IconFonts
