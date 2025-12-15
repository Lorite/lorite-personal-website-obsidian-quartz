# Selective publishing with `publish: true`

If your vault mixes private notes with public ones, you can sync only the notes that have `publish: true` in their frontmatter (and the assets they list) into a smaller folder, then build Quartz from that filtered folder.

## 1) Mark notes for publishing

Add frontmatter to any note you want to publish:

```yaml
---
publish: true
# Optional: place this note at a custom path inside the published folder
path: blog/my-post.md
# Optional: explicitly list assets to copy alongside the note
assets:
  - "[[my-image.png]]"
  - "[[images/diagram.svg]]"
---
```

## 2) Sync the publishable subset

Run the helper script to copy only `publish: true` notes plus listed assets into a clean destination (defaults shown below):

```bash
npm run sync:published -- \
  --source "/path/to/your/vault" \
  --dest ".quartz/published" \
  --assets "assets"
```

Flags:

- `--source` (`-s`): your full Obsidian vault or Quartz content folder (default: `content`).
- `--dest` (`-d`): where the publishable subset is written (default: `.quartz/published`).
- `--assets` (`-a`): destination subfolder for copied assets (default: `assets`).
- `--ignore` (`-i`): extra glob patterns to skip while scanning.
- `--no-clean`: keep existing files in the destination instead of wiping it first.

> The script mirrors the behavior described in [this Obsidian → Quartz sync guide](https://umwelt.dineshnatesan.com/wiki/Obsidian-Quartz-sync): it only copies notes with `publish: true`, honors an optional `path` override, and copies any assets explicitly listed in the frontmatter `assets` array.

## 3) Build Quartz from the filtered folder

Point Quartz at the filtered content directory when building or serving:

```bash
npm run build:published
# or manually
npx quartz build --directory .quartz/published
```

This keeps your private notes out of the build and speeds up compilation by working from a smaller content set.
