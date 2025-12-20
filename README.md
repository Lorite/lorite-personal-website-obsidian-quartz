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

The sync script supports **collection folders** that auto-generate indexes for media consumption tracking (movies, books, games, etc.).

### Collection Setup

Add `collectionIndexOnly: true` to a folder's `index.md` frontmatter to enable collection behavior:

```yaml
---
title: Movies
publish: true
collectionIndexOnly: true
---
```

- **Nested folders inherit collection behavior** — items in `media/videogames/pokemon/` roll up into `media/videogames/`'s index.
- **Auto-generated indexes** — both folder (`media/movies/index.md`) and tag pages (`tags/movies.md`) are created with sorted lists.
- **Wikilink format** — full notes use `[[Title]]`, folder indexes use `[[path/to/folder/]]`.

### Publishing Modes

Control how individual notes appear in indexes using `publish_mode`:

```yaml
---
title: The Matrix
publish: true
publish_mode: full # or 'title' or 'external'
updated: 2024-12-20
---
```

- **`full` (default)** — Note is published and linked with wikilink `[[Title]]` in indexes.
- **`title`** — Note is **not published**; appears as plain text in indexes (for items without detailed notes).
- **`external`** — Note is **not published**; appears as external link using `url` property (for items tracked elsewhere):
  ```yaml
  publish_mode: external
  url: https://example.com/item
  ```

### Sorting

All collection indexes sort items **newest to oldest** based on the `updated` frontmatter property.

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
