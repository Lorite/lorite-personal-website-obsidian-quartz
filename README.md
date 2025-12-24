# Lorite's Notes

## Build and Preview

- Update the generated content files after modifying a note in Obsidian (**run whenever you want to see the changes**): `npm run sync:published -- --source "/home/lori/git/lorite-obsidian-notes" --dest "content"`
- Start the development server (run once): `docker run --rm -it -p 8080:8080 -p 3001:3001 -v ./content:/usr/src/app/content $(docker build -q -t quartz-dev -f Dockerfile.dev .)`
- Open your browser to `http://localhost:8080` to preview the site.

## Frontmatter Properties

- Check [Frontmatter](https://quartz.jzhao.xyz/plugins/Frontmatter)

## GitHub repository

- Rebase the upstream v4 branch into your local v4 branch:

  ```sh
  git checkout preserve-dates
  git fetch upstream
  git rebase --committer-date-is-author-date upstream/v4
  ```

- From https://quartz.jzhao.xyz/setting-up-your-GitHub-repository
  - This is a helper command that will do the initial push of your content to your repository

  ```sh
  npx quartz sync --no-pull
  ```

  - In future updates, you can simply run `npx quartz sync` every time you want to push updates to your repository.

> Flags and options
>
> For full help options, you can run `npx quartz sync --help`.
>
> Most of these have sensible defaults but you can override them if you have a custom setup:
>
> - `-d` or `--directory`: the content folder. This is normally just `content`
> - `-v` or `--verbose`: print out extra logging information
> - `--commit` or `--no-commit`: whether to make a `git` commit for your changes
> - `--push` or `--no-push`: whether to push updates to your GitHub fork of Quartz
> - `--pull` or `--no-pull`: whether to try and pull in any updates from your GitHub fork (i.e. from other devices) before pushing

## Private Notes and Partial Notes

- I created a npm function `publish:sync` so that only the notes with the frontmatter property `publish: true` will be copied to the content folder in the quartz repository.
- I also use a specific syntax inside the notes to tell the parser to not copy the text in between.
  {% start_private_notes %}
  This is how
  {% end_private_notes %}

## Collections and Publishing Modes

The sync script supports **collection folders** that auto-generate index pages for media tracking (movies, books, games, tools, etc.).

### Collection Setup

Mark a folder as a collection by adding `collectionIndexOnly: true` to the frontmatter of any note inside that folder — you can name it anything (e.g., “List of movies I have watched”). It does not need to be `index.md`.

Example source note (lives in your Obsidian vault):

```yaml
---
title: List of movies I have watched
publish: true
collectionIndexOnly: true
---
```

What happens during sync:

- **Generated index filename**: The output file in `content/` is created in the same folder and is named after the note’s `title` (sanitized), e.g. `content/media/movies/List of movies I have watched.md`.
- **Source note is not copied**: The `collectionIndexOnly` source file is skipped from copying and replaced by the generated index.
- **Tags**: The generated index includes `tags` from the folder path (e.g., `media`, `movies`) plus an internal tag `collection-index` used for filtering.
- **Recent Notes panel**: Generated collection indexes are hidden from the left “Recent Notes” panel.
- **Nested roll-up**: Notes in subfolders (e.g., `media/videogames/pokemon/`) will roll up into the closest collection folder’s index.

### Publishing Modes

Control how individual notes appear in collection indexes using `publish_mode`:

```yaml
---
title: The Matrix
publish: true
publish_mode: full # or 'title' or 'external'
updated: 2024-12-20
---
```

- **`full` (default)** — The note is copied to `content/` and listed as `[[Title]]` in indexes.
- **`title`** — The note is not copied; shown as plain text in the index (use for lightweight entries).
- **`external`** — The note is not copied; shown as an external link using the `url` property:
  ```yaml
  publish_mode: external
  url: https://example.com/item
  ```

Notes outside a collection folder always copy when `publish: true`. Inside a collection folder, only `publish_mode: full` notes are copied; `title` and `external` remain index-only entries.

### Sorting

All collection indexes sort entries **newest → oldest** using the `updated` frontmatter. If omitted or invalid, items fall back to the bottom.

## Recent Notes Panel

The left “Recent Notes” panel shows the most recently updated notes. It is configured in `quartz.layout.ts` using a specialized Explorer variant and a filter that excludes generated collection index pages.

- **Excludes generated indexes**: Files tagged with `collection-index` are hidden from Recent Notes.
- **Only notes with dates**: The filter also requires a valid `date` (derived from your configured `defaultDateType`).
- **Where to change it**: `quartz.layout.ts`, the `recentNotesExplorer` config.

Example (excerpt):

```ts
const recentNotesExplorer = Component.Explorer({
  title: "Recent Notes",
  variant: "recent-notes",
  folderDefaultState: "open",
  limit: 10,
  filterFn: (node) => {
    if (node.isFolder) return node.slugSegment !== "tags"
    const tags = Array.isArray(node.data?.tags) ? node.data.tags : []
    if (tags.includes("collection-index")) return false
    return node.data?.date !== undefined
  },
})
```

Customize `limit`, add more exclusions, or change sorting as needed.

## Tags Explorer Panel

The left “Tag Explorer” works similarly to the regular Explorer, but groups by tags instead of folders.

- Lists every tag found in note frontmatter.
- Under each tag, shows all files that contain that tag.
- The same file can appear under multiple tags.
- Tag groups can be expanded/collapsed like folders.

Configuration: adjust the component in `quartz.layout.ts` via `Component.TagExplorer({ ... })`. You can customize sorting and filtering, but the default behavior is alphabetical ordering of tags and files.

# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
