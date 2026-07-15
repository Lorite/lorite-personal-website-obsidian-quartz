import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"

// JS-callback plugin options that can't be expressed in quartz.config.yaml.
// These MUST run before loadQuartzConfig() so they're applied when components are instantiated.

// Minimal shape of the Explorer plugin's FileTrieNode (the plugin module under .quartz/plugins is not
// type-resolved by tsc, so annotate the callback params to keep `npm run check` clean).
interface ExplorerNode {
  slugSegment?: string
  displayName?: string
  isFolder: boolean
  data: Record<string, unknown> | null
}

// Explorer: hide the auto-generated `tags` folder and sort folders-first, then alphabetically —
// ported from the v4 quartz.layout.ts `normalFolderExplorer`.
ExternalPlugin.Explorer({
  folderDefaultState: "collapsed",
  filterFn: (node: ExplorerNode) => node.slugSegment !== "tags",
  sortFn: (a: ExplorerNode, b: ExplorerNode) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return (a.displayName ?? "").localeCompare(b.displayName ?? "")
  },
  order: ["filter", "sort"],
})

// Recent Notes: exclude the generated collection-index notes (research/movies/... lists) so the panel
// shows real recent notes — ported from the v4 quartz.layout.ts recent-notes filter.
ExternalPlugin.RecentNotes({
  filter: (f: { frontmatter?: { tags?: unknown } }) => {
    const tags = Array.isArray(f.frontmatter?.tags) ? (f.frontmatter?.tags as string[]) : []
    return !tags.includes("collection-index")
  },
})

const config = await loadQuartzConfig()

// baseUrl override: quartz.config.yaml hardcodes the Coolify domain (alejandro.lorite.eu), but the
// GitHub Pages CI sets QUARTZ_BASE_URL to the project-pages URL. YAML can't read env, so apply it here
// (mirrors the v4 `process.env.QUARTZ_BASE_URL ?? "alejandro.lorite.eu"` behaviour).
if (process.env.QUARTZ_BASE_URL) {
  config.configuration.baseUrl = process.env.QUARTZ_BASE_URL
}

export default config
export const layout = await loadQuartzLayout()
