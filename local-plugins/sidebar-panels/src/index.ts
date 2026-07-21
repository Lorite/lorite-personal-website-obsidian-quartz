import type { QuartzTransformerPlugin } from "@quartz-community/types"
import styles from "./sidebarPanels.css"
// The build script bundles *.inline.ts to an IIFE and imports it as a string.
import script from "./sidebarPanels.inline"

/**
 * Presents the three left-sidebar panels (Recent Notes, Explorer, Tag Explorer) as one panel with
 * collapsible sections. Requires those plugins to share the `sidebar-panels` layout group in
 * quartz.config.yaml, which is what puts them in a single container.
 */
const SidebarPanels: QuartzTransformerPlugin = () => ({
  name: "SidebarPanels",
  // Quartz validates a transformer instance by looking for at least one of textTransform /
  // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS + JS.
  htmlPlugins() {
    return []
  },
  externalResources() {
    return {
      css: [{ content: styles, inline: true, spaPreserve: true }],
      js: [
        {
          loadTime: "afterDOMReady",
          contentType: "inline",
          spaPreserve: true,
          script,
        },
      ],
    }
  },
})

export default SidebarPanels
