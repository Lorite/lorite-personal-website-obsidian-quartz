import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const recentNotesExplorer = Component.Explorer({
  title: "Recent Notes",
  variant: "recent-notes",
  folderDefaultState: "open",
  limit: 10,
  filterFn: (node) => {
    // Keep folders (except tags), but filter files to only show those with dates
    if (node.isFolder) {
      return node.slugSegment !== "tags"
    }
    const tags = Array.isArray(node.data?.tags) ? node.data?.tags : []
    if (tags.includes("collection-index")) return false
    return node.data?.dates?.modified !== undefined
  },
  sortFn: (a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    if (!a.isFolder && !b.isFolder) {
      const aModified = a.data?.dates?.modified
      const bModified = b.data?.dates?.modified
      const aDate = aModified ? new Date(aModified).getTime() : 0
      const bDate = bModified ? new Date(bModified).getTime() : 0
      return bDate - aDate
    }
    return a.displayName.localeCompare(b.displayName)
  },
  order: ["filter", "sort"],
})

const normalFolderExplorer = Component.Explorer({
  title: "Folder Explorer",
  folderDefaultState: "collapsed",
  filterFn: (node) => {
    return node.slugSegment !== "tags"
  },
  sortFn: (a, b) => {
    // Sort: folders first, then by name
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    // If both are folders or both are files, sort alphabetically
    return a.displayName.localeCompare(b.displayName)
  },
  order: ["filter", "sort"],
})

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    name: "Alejandro Lorite Mora",
    role: "Robotics PhD Student",
    organization: { name: "IT University of Copenhagen", url: "https://www.itu.dk/" },
    links: [
      { text: "Email", href: "mailto:a.lorite.mora@gmail.com", icon: "fa-solid fa-envelope" },
      {
        text: "Google Scholar",
        href: "https://scholar.google.es/citations?user=M5fEBD8AAAAJ&hl=en",
        icon: "fa-solid fa-graduation-cap",
      },
      { text: "GitHub", href: "https://github.com/Lorite", icon: "fa-brands fa-github" },
      {
        text: "LinkedIn",
        href: "https://www.linkedin.com/in/alejandro-lorite-mora",
        icon: "fa-brands fa-linkedin",
      },
      { text: "X", href: "https://x.com/aloritemora", icon: "fa-brands fa-x-twitter" },
    ],
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    // Breadcrumbs left, simple text right using Flex
    Component.Flex({
      components: [
        {
          Component: Component.ConditionalRender({
            component: Component.Breadcrumbs(),
            condition: (page) => page.fileData.slug !== "index",
          }),
          grow: true,
        },
        {
          Component: Component.TopMenu(),
          align: "center",
        },
      ],
      gap: "0.5rem",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  afterBody: [
    Component.Comments({
      provider: "giscus",
      options: {
        // from data-repo
        repo: "Lorite/lorite-personal-website-obsidian-quartz",
        // from data-repo-id
        repoId: "R_kgDOQpBfoQ",
        // from data-category
        category: "Announcements",
        // from data-category-id
        categoryId: "DIC_kwDOQpBfoc4C0BmP",
        // from data-lang
        lang: "en",
        // Use official Giscus themes to keep contrast readable in dark mode
        themeUrl: "https://giscus.app/themes",
        lightTheme: "light",
        darkTheme: "dark_dimmed",
      },
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    // On desktop, show recent notes explorer, folder explorer and tag explorer
    Component.DesktopOnly(recentNotesExplorer),
    Component.DesktopOnly(
      Component.Explorer({
        title: "Folder Explorer",
        folderDefaultState: "collapsed",
      }),
    ),
    Component.DesktopOnly(
      Component.TagExplorer({
        title: "Tag Explorer",
      }),
    ),
    // On mobile, only show the folder explorer
    Component.MobileOnly(normalFolderExplorer),
  ],
  right: [
    Component.Graph({
      localGraph: {
        depth: 2,
        showTags: true,
      },
      globalGraph: {
        showTags: true,
      },
    }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
    Component.MobileOnly(
      Component.RecentNotes({
        title: "Recent Notes",
        limit: 10,
        filter: (node) => {
          if (node.isFolder) {
            return node.slugSegment !== "tags"
          }
          const tags = Array.isArray(node.frontmatter?.tags) ? node.frontmatter?.tags : []
          if (tags.includes("collection-index")) return false
          return node.dates?.modified !== undefined
        },
      }),
    ),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Flex({
      components: [
        {
          Component: Component.Breadcrumbs(),
          grow: true,
        },
        {
          Component: Component.TopMenu(),
          align: "center",
        },
      ],
      gap: "0.5rem",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    // On desktop, show recent notes explorer, folder explorer and tag explorer
    Component.DesktopOnly(recentNotesExplorer),
    Component.DesktopOnly(
      Component.Explorer({
        title: "Folder Explorer",
        folderDefaultState: "collapsed",
      }),
    ),
    Component.DesktopOnly(
      Component.TagExplorer({
        title: "Tag Explorer",
      }),
    ),
    // On mobile, only show the folder explorer
    Component.MobileOnly(normalFolderExplorer),
  ],
  right: [],
}
