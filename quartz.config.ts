import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const baseUrl = process.env.QUARTZ_BASE_URL ?? "alejandro.lorite.eu"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "Lorite's Notes",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl,
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          // Beach Day: Pastel sky & sand
          light: "#FFFBF0",
          lightgray: "#E8F4F8",
          gray: "#C8D8E4",
          darkgray: "#5A7A8C",
          dark: "#2C3E50",
          // Links: Ocean teal
          secondary: "#0084A7",
          // Hover: Boston Dynamics yellow
          tertiary: "#FBD403",
          // Code highlight: Soft sand tint
          highlight: "rgba(251, 212, 3, 0.08)",
          // Selection: Warm pastel yellow
          textHighlight: "#FBD40344",
        },
        darkMode: {
          // Sunset Beach: Deep ocean + warm glow
          // Dark navy sky
          light: "#1A2332",
          // Deep ocean
          lightgray: "#2A3A52",
          // Muted ocean teal
          gray: "#4A5F7A",
          // Sand/foam (text)
          darkgray: "#E8E0D0",
          // Bright sand (headings)
          dark: "#FBF6ED",
          // Links: Bright cyan/aqua
          secondary: "#50D4FF",
          // Hover: Golden sunset
          tertiary: "#FFB84D",
          // Code highlight: Sunset glow
          highlight: "rgba(255, 184, 77, 0.15)",
          // Selection: Deep sunset purple
          textHighlight: "#FF6B9D66",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "dracula-soft",
          dark: "dracula",
        },
        keepBackground: false,
      }),
      // Plugin.Citations({
      //   bibliographyFile: "./content/.website-files/lorite-zotero.bib", // TODO: change this to your bibliography file
      //   csl: "./content/.website-files/ieee.csl", // TODO: change this to your preferred CSL file
      // }),
      Plugin.ObsidianFlavoredMarkdown({
        enableInHtmlEmbed: true,
      }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({
        markdownLinkResolution: "shortest",
        onBrokenWikilink: "remove",
      }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts(), Plugin.ExplicitPublish()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
