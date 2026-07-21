import type { QuartzTransformerPlugin } from "@quartz-community/types"
import styles from "./collectionTable.css"
// The build script bundles *.inline.ts to an IIFE and imports it as a string.
import script from "./collectionTable.inline"

/**
 * Makes the generated collection-index tables (movies, research, ...) sortable and filterable.
 *
 * This is the lighter alternative to migrating the media collections to Obsidian Bases: Bases render
 * over notes that exist as pages, which would mean publishing ~2000 external-only media records as
 * stub pages. Enhancing the existing generated tables gives the same sort/filter affordance while the
 * site stays at ~20 collection pages.
 */
const CollectionTable: QuartzTransformerPlugin = () => ({
  name: "CollectionTable",
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

export default CollectionTable
