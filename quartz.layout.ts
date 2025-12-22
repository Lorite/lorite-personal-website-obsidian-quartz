import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

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
    Component.Explorer({
      title: "Folder Explorer",
      folderDefaultState: "collapsed",
    }),
    Component.TagExplorer({
      title: "Tag Explorer",
    }),
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
    Component.Explorer({
      title: "Folder Explorer",
      folderDefaultState: "collapsed",
    }),
    Component.TagExplorer({
      title: "Tag Explorer",
    }),
  ],
  right: [],
}
