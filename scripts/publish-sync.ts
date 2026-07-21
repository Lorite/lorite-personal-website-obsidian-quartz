#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { globby } from "globby"
import matter from "gray-matter"
import YAML from "yaml"
import yargs from "yargs/yargs"
import { hideBin } from "yargs/helpers"

const argv = yargs(hideBin(process.argv))
  .scriptName("publish-sync")
  .usage("$0 [options]")
  .option("source", {
    alias: "s",
    type: "string",
    default: process.env.QUARTZ_VAULT ?? "content",
    describe: "Path to the full Obsidian vault (or Quartz content folder)",
  })
  .option("dest", {
    alias: "d",
    type: "string",
    default: ".quartz/published",
    describe: "Destination folder to mirror publishable notes into",
  })
  .option("assets", {
    alias: "a",
    type: "string",
    default: "",
    describe: "Destination subfolder for copied assets",
  })
  .option("ignore", {
    alias: "i",
    type: "array",
    default: [
      "**/.git/**",
      "**/.obsidian/**",
      "**/.trash/**",
      "**/.quartz/**",
      "**/node_modules/**",
    ],
    describe: "Glob patterns to ignore when scanning for notes/assets",
  })
  .option("clean", {
    alias: "c",
    type: "boolean",
    default: true,
    describe: "Clean destination before syncing",
  })
  .option("fixed", {
    alias: "f",
    type: "string",
    default: "content_fixed",
    describe: "Optional folder to merge into destination after sync (set empty string to disable)",
  })
  .help()
  .parseSync()

const sourceRoot = path.resolve(argv.source)
const destRoot = path.resolve(argv.dest)
const destAssetRoot = path.join(destRoot, argv.assets)
const fixedRootRaw = typeof argv.fixed === "string" ? argv.fixed.trim() : ""
const fixedRoot = fixedRootRaw.length > 0 ? path.resolve(fixedRootRaw) : ""

const ASSET_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
  ".pdf",
  ".mp4",
  ".mov",
  ".webm",
  ".mp3",
  ".wav",
  ".ogg",
])

function shouldPublish(value: unknown) {
  return value === true || value === "true"
}

// Media notes carry a `status` frontmatter property sharing the TaskNotes vocabulary
// (new / backlog / todo / investigating / in-progress / continuous / blocked / pending-review /
// done / cancelled). The collection indexes are "things I have consumed" lists, so only items whose
// status says the item has been (or is being) consumed are listed. Everything else — the triage
// inbox (`new`), the wish list (`backlog`, `todo`), samples (`investigating`), and abandoned or
// unavailable items (`cancelled`, `blocked`) — is kept out of the list.
const LISTED_STATUSES = new Set(["done", "pending-review", "in-progress", "continuous"])

// Notes without a `status` are always listed: several collection folders (places, websites,
// digital_tools, courses, conferences) predate the status migration and never carried one.
function isListedStatus(value: unknown): boolean {
  if (value === undefined || value === null) return true
  const status = String(value).trim().toLowerCase()
  if (status.length === 0) return true
  return LISTED_STATUSES.has(status)
}

function normalizePathFragment(fragment: string) {
  return fragment.replace(/^\.{1,2}\/+/, "").replace(/\\/g, "/")
}

function normalizeAssetRef(ref: string) {
  const trimmed = ref.trim()
  if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
    return trimmed.slice(2, -2)
  }
  return trimmed.replace(/^!/, "")
}

function stripAliasAndFragment(ref: string) {
  // Obsidian alias: file.png|Alias -> take before '|'
  const base = ref.split("|")[0]
  // Strip URL fragment (?x or #x)
  return base.split("#")[0].split("?")[0]
}

function isExternal(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith("data:")
}

function isAssetPath(p: string): boolean {
  const ext = path.extname(p.toLowerCase())
  return ASSET_EXTS.has(ext)
}

function removePrivateNotes(content: string): string {
  return content.replace(
    /\n*{%\s*start_private_notes\s*%\}[\s\S]*?\{%\s*end_private_notes\s*%\}\n*/g,
    "",
  )
}

// Drop "AI Generated" sections from published content. AI-authored notes (literature summaries,
// task work-log entries, flashcards, etc.) live under a heading whose text contains "AI generated"
// (any level, any wording: `# AI Generated`, `### AI generated — ...`, `## AI Generated Answer`,
// `## Action Items (AI generated)`, ...). The heading and everything under it, up to the next heading
// of the same or higher level, is removed. Fenced code blocks are respected so a `#` line inside a
// code block is never mistaken for a heading boundary.
function removeAiGeneratedSections(content: string): string {
  const lines = content.split("\n")
  const out: string[] = []
  let fenceMarker: string | null = null
  let skipLevel: number | null = null // heading level of the AI section currently being dropped

  for (const line of lines) {
    const fence = line.match(/^\s*(```|~~~)/)
    if (fence) {
      if (fenceMarker === null) fenceMarker = fence[1]
      else if (line.trimStart().startsWith(fenceMarker)) fenceMarker = null
      if (skipLevel === null) out.push(line)
      continue
    }

    if (fenceMarker === null) {
      const heading = line.match(/^(#{1,6})\s+(.*\S)\s*$/)
      if (heading) {
        const level = heading[1].length
        // A heading at the same or higher level ends the section we were dropping
        if (skipLevel !== null && level <= skipLevel) skipLevel = null
        // Start dropping if this heading marks an AI-generated section
        if (skipLevel === null && /\bai\s+generated\b/i.test(heading[2])) {
          skipLevel = level
          continue
        }
      }
    }

    if (skipLevel === null) out.push(line)
  }

  return out.join("\n")
}

// Strip HTML comments (<!-- ... -->) from published content. Two or more HTML comments in a single
// note crash the Quartz build (parse5 `_stateComment` null-deref via rehype-raw), so tools like the
// Boox highlight extractor that wrap sections in <!-- markers --> would take down the whole site.
// Comments are invisible on the rendered page anyway. Fenced code blocks and inline code spans are
// preserved so documentation that shows literal <!-- --> examples is not corrupted.
function removeHtmlComments(content: string): string {
  const placeholders: string[] = []
  const stash = (m: string) => {
    const token = `\uE000CODE${placeholders.length}\uE000`
    placeholders.push(m)
    return token
  }

  // Protect fenced code blocks (``` or ~~~) and inline code spans before stripping comments
  const protectedContent = content
    .replace(/(^|\n)(```|~~~)[\s\S]*?\n\2[ \t]*(?=\n|$)/g, stash)
    .replace(/`[^`\n]*`/g, stash)

  const stripped = protectedContent.replace(/<!--[\s\S]*?-->/g, "")

  // Restore protected code segments
  return stripped.replace(/\uE000CODE(\d+)\uE000/g, (_m, i) => placeholders[Number(i)])
}

function removeLocalLinks(content: string): string {
  const localSchemes = ["zotero://", "obsidian://", "file://"]
  const hasLocalScheme = (href: string) =>
    localSchemes.some((scheme) => href.toLowerCase().startsWith(scheme))

  // Strip markdown links pointing to local schemes, keep the link text to preserve readability
  const stripMdLinks = content.replace(
    /!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (m, text, href) => {
      if (hasLocalScheme(href)) return text || ""
      return m
    },
  )

  // Remove autolinks like <zotero://...>
  return stripMdLinks.replace(/<([^>]+)>/g, (m, href) => {
    if (hasLocalScheme(href)) return ""
    return m
  })
}

function replaceWikilinksWithExternal(content: string, externalMap: Map<string, string>): string {
  // Replace wikilinks [[Title]] or [[Title|Alias]] with external markdown links
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
    const parts = inner.split("|")
    const title = parts[0].trim()
    const alias = parts.length > 1 ? parts[1].trim() : title

    // Check if this title has an external URL
    const externalUrl = externalMap.get(title)
    if (externalUrl) {
      return `[${alias}](${externalUrl})`
    }

    // Keep the wikilink as-is if no external URL found
    return match
  })
}

function extractAssetRefsFromContent(contents: string): string[] {
  const refs = new Set<string>()

  // Markdown images ![alt](path "title") and links [text](path)
  const mdLinkRe = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let m: RegExpExecArray | null
  while ((m = mdLinkRe.exec(contents)) !== null) {
    const href = m[1]
    if (!isExternal(href)) {
      const cleaned = stripAliasAndFragment(normalizePathFragment(href))
      if (isAssetPath(cleaned)) refs.add(cleaned)
    }
  }

  // Obsidian embeds ![[asset.ext]] and links [[asset.ext]] (only if looks like asset)
  const obsidianLinkRe = /!?\[\[([^\]]+)\]\]/g
  while ((m = obsidianLinkRe.exec(contents)) !== null) {
    const target = stripAliasAndFragment(normalizePathFragment(m[1]))
    if (isAssetPath(target)) refs.add(target)
  }

  // HTML tags <img src="...">, <video src>, <audio src>, <source src>
  const htmlSrcRe = /<(?:img|video|audio|source)[^>]*\s+src=["']([^"']+)["'][^>]*>/gi
  while ((m = htmlSrcRe.exec(contents)) !== null) {
    const href = m[1]
    if (!isExternal(href)) {
      const cleaned = stripAliasAndFragment(normalizePathFragment(href))
      if (isAssetPath(cleaned)) refs.add(cleaned)
    }
  }

  return Array.from(refs)
}

async function pathExists(fp: string) {
  try {
    await fs.promises.access(fp, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveAssetPath(assetRef: string, ignoreGlobs: string[]): Promise<string | null> {
  const cleanedRef = normalizePathFragment(normalizeAssetRef(assetRef))
  const directPath = path.join(sourceRoot, cleanedRef)
  if (await pathExists(directPath)) return directPath

  const matches = await globby([`**/${path.basename(cleanedRef)}`], {
    cwd: sourceRoot,
    absolute: true,
    ignore: ignoreGlobs,
  })

  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    console.warn(`⚠️  Multiple matches for asset '${cleanedRef}', skipping to avoid ambiguity.`)
  } else {
    console.warn(`⚠️  Asset '${cleanedRef}' not found under ${sourceRoot}.`)
  }
  return null
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[<>:"|?*\x00-\x1f]/g, "_")
}

function resolveNoteDestination(srcFile: string, frontmatterPath?: unknown) {
  const rel = path.relative(sourceRoot, srcFile)
  if (typeof frontmatterPath === "string" && frontmatterPath.length > 0) {
    const normalized = normalizePathFragment(frontmatterPath)
    const sanitized = normalized
      .split("/")
      .map((seg) => sanitizeFilename(seg))
      .join("/")
    if (sanitized.endsWith(".md")) {
      return path.join(destRoot, sanitized)
    }
    return path.join(destRoot, sanitized, sanitizeFilename(path.basename(srcFile)))
  }
  const sanitizedRel = rel
    .split("/")
    .map((seg) => sanitizeFilename(seg))
    .join("/")
  return path.join(destRoot, sanitizedRel)
}

async function copyFile(src: string, dest: string) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.copyFile(src, dest)
}

async function copyDirectoryContents(srcDir: string, destDir: string): Promise<number> {
  let copiedFiles = 0
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true })
  await fs.promises.mkdir(destDir, { recursive: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      copiedFiles += await copyDirectoryContents(srcPath, destPath)
      continue
    }

    if (entry.isFile()) {
      await copyFile(srcPath, destPath)
      copiedFiles += 1
    }
  }

  return copiedFiles
}

function expandIgnorePatterns(patterns: string[]): string[] {
  const out: string[] = []
  for (const raw of patterns) {
    if (!raw || typeof raw !== "string") continue
    const p = raw.replace(/^\.\//, "")
    const hasGlob = /[\\*?\[\]]/.test(p)
    if (hasGlob) {
      out.push(`**/${p}`)
    } else {
      out.push(`**/${p}`, `**/${p}/**`)
    }
  }
  return Array.from(new Set(out))
}

async function loadQuartzIgnorePatterns(): Promise<string[]> {
  // Quartz 5 moved configuration from quartz.config.ts to quartz.config.yaml
  // (falling back to quartz.config.default.yaml, matching the config-loader resolution order).
  const candidates = ["quartz.config.yaml", "quartz.config.default.yaml"].map((f) =>
    path.resolve(process.cwd(), f),
  )
  const configPath = (
    await Promise.all(candidates.map(async (p) => ((await pathExists(p)) ? p : "")))
  ).find(Boolean)
  if (!configPath) return []
  try {
    const content = await fs.promises.readFile(configPath, "utf8")
    const parsed = YAML.parse(content) as { configuration?: { ignorePatterns?: unknown } }
    const patterns = parsed?.configuration?.ignorePatterns
    if (Array.isArray(patterns)) {
      return patterns.filter((p): p is string => typeof p === "string")
    }
    return []
  } catch (e) {
    console.warn("⚠️  Could not read ignorePatterns from quartz.config.yaml:", (e as Error).message)
    return []
  }
}

// Load folders that opt into collection index-only behavior via frontmatter in their source files
async function loadCollectionFolders(
  sourceRoot: string,
  ignoreGlobs: string[],
): Promise<Set<string>> {
  const collection = new Set<string>()
  const allMarkdownFiles = await globby(["**/*.md"], {
    cwd: sourceRoot,
    absolute: true,
    ignore: ignoreGlobs,
  })
  for (const fp of allMarkdownFiles) {
    try {
      const raw = await fs.promises.readFile(fp, "utf8")
      const parsed = matter(raw)
      const fm = parsed.data as Record<string, unknown>
      const isCollection =
        fm.collectionIndexOnly === true ||
        fm.collectionIndexOnly === "true" ||
        fm.collection === "index-only"
      if (isCollection) {
        const relFolder = path.dirname(path.relative(sourceRoot, fp)).replace(/\\/g, "/")
        collection.add(relFolder)
      }
    } catch (e) {
      console.warn(`⚠️  Failed to read file for collection check: ${fp}`, (e as Error).message)
    }
  }
  return collection
}

// Check if a folder belongs to a collection (either directly or as a subfolder)
function isInCollection(folderPath: string, collectionFolders: Set<string>): string | null {
  for (const collFolder of collectionFolders) {
    // Direct match
    if (folderPath === collFolder) return collFolder
    // Subfolder match: folderPath starts with collFolder followed by /
    if (folderPath.startsWith(collFolder + "/")) return collFolder
  }
  return null
}

function getRatingColor(rating: number | undefined): string {
  if (rating === undefined || rating === 0) return ""
  if (rating >= 9.5) return "#00aa00" // Dark green
  if (rating >= 9) return "#22cc22" // Green
  if (rating >= 8.5) return "#44dd44" // Light green
  if (rating >= 8) return "#88dd44" // Yellow-green
  if (rating >= 7.5) return "#bbdd44" // Lime
  if (rating >= 7) return "#dddd00" // Yellow
  if (rating >= 6) return "#dd9900" // Orange
  if (rating >= 5) return "#dd6600" // Dark orange
  return "#dd3300" // Red
}

// Generate collection index (folder or tag) with list of notes
type NoteMeta = {
  title: string
  destPath: string
  folderRel: string
  srcFolderRel: string
  mode: "full" | "title" | "external"
  externalUrl?: string
  updatedTS: number
  collectionRoot?: string
  personalRating?: number
  itemType?: string
}

function humanizeItemType(itemType?: string): string {
  if (!itemType) return ""
  return itemType
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function isResearchMediaFolder(folderRel: string): boolean {
  return folderRel === "media/research" || folderRel.startsWith("media/research/")
}

function getDisplayTitle(note: NoteMeta): string {
  if (!isResearchMediaFolder(note.srcFolderRel)) return note.title
  const itemTypeLabel = humanizeItemType(note.itemType)
  if (!itemTypeLabel) return note.title
  return `${note.title} (${itemTypeLabel})`
}

async function generateCollectionIndex(
  indexPath: string,
  indexDir: string,
  title: string,
  notes: NoteMeta[],
  filterIndexPath?: string,
  frontmatterExtra?: Record<string, unknown>,
): Promise<number> {
  // Sort by date (newest first)
  const sortedNotes = notes.slice().sort((a, b) => (b.updatedTS || 0) - (a.updatedTS || 0))

  // Filter out index.md if path specified, or by basename
  const listNotes = filterIndexPath
    ? sortedNotes.filter(
        (n) =>
          path.normalize(n.destPath).toLowerCase() !==
          path.normalize(filterIndexPath).toLowerCase(),
      )
    : sortedNotes.filter((n) => path.basename(n.destPath).toLowerCase() !== "index.md")

  // Build a GitHub-flavored markdown table. A markdown table (rather than raw HTML) matters: cells
  // still go through the markdown pipeline, so [[wikilinks]] in "full" mode entries resolve. The
  // `collection-table` plugin turns the rendered <table> into a sortable/filterable one client-side.
  //
  // Columns are conditional so collections without ratings or item types don't show empty columns.
  const hasType = listNotes.some((n) => humanizeItemType(n.itemType))
  const hasRating = listNotes.some((n) => n.personalRating !== undefined && n.personalRating !== 0)
  const hasDate = listNotes.some((n) => n.updatedTS > 0)

  // Escape characters that would otherwise break out of a markdown table cell.
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim()

  const headers = ["Title", ...(hasType ? ["Type"] : []), ...(hasRating ? ["Rating"] : [])]
  if (hasDate) headers.push("Updated")

  const lines: string[] = []
  lines.push(`${title}, newest first. Click a column header to sort.`)
  lines.push("")
  lines.push(`| ${headers.join(" | ")} |`)
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`)

  for (const n of listNotes) {
    // The item type gets its own column now, so titles no longer need the "(journal article)"
    // suffix — which also means wikilinks can be written without an alias. That avoids a literal
    // "|" inside [[...]], which a markdown table would otherwise treat as a column separator.
    let titleCell: string
    if (n.mode === "external" && n.externalUrl) {
      titleCell = `[${cell(n.title)}](${n.externalUrl})`
    } else if (n.mode === "full") {
      if (path.basename(n.destPath).toLowerCase() === "index.md") {
        titleCell = `[[${n.folderRel.replace(/\\/g, "/")}/]]`
      } else {
        titleCell = `[[${cell(n.title)}]]`
      }
    } else {
      titleCell = cell(n.title)
    }

    const row = [titleCell]

    if (hasType) row.push(cell(humanizeItemType(n.itemType)))

    if (hasRating) {
      const hasValue = n.personalRating !== undefined && n.personalRating !== 0
      row.push(
        hasValue
          ? `<span style="color:${getRatingColor(n.personalRating)}">${n.personalRating}/10</span>`
          : "",
      )
    }

    if (hasDate) {
      // <time datetime> gives the sort script an exact, locale-independent value to compare.
      const iso = n.updatedTS > 0 ? new Date(n.updatedTS).toISOString() : ""
      row.push(iso ? `<time datetime="${iso}">${iso.slice(0, 10)}</time>` : "")
    }

    lines.push(`| ${row.join(" | ")} |`)
  }

  const content = lines.join("\n")
  const extra = frontmatterExtra ?? {}
  const extraTags = Array.isArray(extra.tags) ? (extra.tags as string[]) : []
  const tags = Array.from(new Set([...extraTags, "collection-index"]))
  // cssclasses lands on the rendered <article> (see the content-page plugin), which is how the
  // collection-table script scopes itself to these generated pages only.
  const fm = { title, publish: true, cssclasses: ["collection-index"], ...extra, tags }
  const fileOut = matter.stringify(content, fm)
  await fs.promises.mkdir(indexDir, { recursive: true })
  await fs.promises.writeFile(indexPath, fileOut, "utf8")

  return listNotes.length
}

async function sync() {
  if (!(await pathExists(sourceRoot))) {
    console.error(`Source folder '${sourceRoot}' does not exist.`)
    process.exit(1)
  }

  // Collect .gitkeep files before cleaning
  const gitkeepFiles: string[] = []
  if (await pathExists(destRoot)) {
    const allDest = await globby(["**/.gitkeep"], {
      cwd: destRoot,
      absolute: true,
    })
    gitkeepFiles.push(...allDest)
  }

  if (argv.clean) {
    // Keep the destination root to avoid breaking watchers; remove only contents
    if (await pathExists(destRoot)) {
      const entries = await fs.promises.readdir(destRoot, { withFileTypes: true })
      for (const entry of entries) {
        const target = path.join(destRoot, entry.name)
        await fs.promises.rm(target, { recursive: true, force: true })
      }
    }
  }
  await fs.promises.mkdir(destRoot, { recursive: true })

  // Restore .gitkeep files
  for (const gitkeepFile of gitkeepFiles) {
    const dir = path.dirname(gitkeepFile)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(gitkeepFile, "")
  }

  // Build ignore globs by merging CLI ignores with Quartz config ignorePatterns
  const cliIgnore = (argv.ignore as string[]) ?? []
  const quartzIgnores = await loadQuartzIgnorePatterns()
  const ignoreGlobs = Array.from(
    new Set([...expandIgnorePatterns(cliIgnore), ...expandIgnorePatterns(quartzIgnores)]),
  )

  // Folders that opt into index-only behavior
  const collectionFolders = await loadCollectionFolders(sourceRoot, ignoreGlobs)

  const markdownFiles = await globby(["**/*.md"], {
    cwd: sourceRoot,
    absolute: true,
    ignore: ignoreGlobs,
  })

  let publishedCount = 0
  let assetCount = 0
  const assetsToCopy = new Map<string, string>()
  let unlistedCount = 0
  let folderIndexCount = 0
  let folderIndexItemsTotal = 0
  let tagIndexCount = 0
  let tagIndexItemsTotal = 0

  const folderNotes = new Map<string, NoteMeta[]>()
  const tagNotes = new Map<string, NoteMeta[]>()
  const folderIndexTitles = new Map<string, string>()

  // Map of note titles to external URLs for notes with publish_mode: external
  const externalUrlMap = new Map<string, string>()

  // Track all published notes to process wikilink replacements later
  const publishedNotePaths: string[] = []

  for (const file of markdownFiles) {
    const contents = await fs.promises.readFile(file, "utf8")
    const parsed = matter(contents)

    const modeRaw = parsed.data.publish_mode as any
    const mode: "full" | "title" | "external" = (modeRaw as any) ?? "full"
    const externalUrl = typeof parsed.data.url === "string" ? parsed.data.url : undefined
    const title = (parsed.data.title as string) ?? path.parse(file).name
    const filename = path.parse(file).name // filename without extension

    // If publish_mode is external and has a URL, add to external map
    // Map both the title and filename so wikilinks work with either
    if (externalUrl && (mode === "external" || modeRaw === undefined || modeRaw === null)) {
      externalUrlMap.set(title, externalUrl)
      externalUrlMap.set(filename, externalUrl)
    }

    if (!shouldPublish(parsed.data.publish)) continue

    const dest = resolveNoteDestination(file, parsed.data.path)

    // Skip external mode files if folder has no collectionIndexOnly file
    const srcFolderRelCheck = path.dirname(path.relative(sourceRoot, file)).replace(/\\/g, "/")
    const collectionRootCheck = isInCollection(srcFolderRelCheck, collectionFolders)
    if (mode === "external" && !collectionRootCheck) {
      continue
    }

    // Inside a collection, `status` decides whether the item is listed in the collection index.
    // The index file itself is exempt (it is regenerated, and its own status is meaningless).
    const isIndexFile =
      parsed.data.collectionIndexOnly === true ||
      parsed.data.collectionIndexOnly === "true" ||
      parsed.data.collection === "index-only"
    const listed =
      !collectionRootCheck || isIndexFile || isListedStatus((parsed.data as any).status)

    // external/title notes only ever exist as a list entry — unlisted means nothing to publish.
    // full notes are real pages (hand-written "TODO ... I want to watch" pages, video write-ups),
    // so they keep their page and are merely left out of the "I have consumed" list.
    if (!listed) {
      unlistedCount += 1
      if (mode !== "full") continue
    }

    // Extract personal_rating if present
    let personalRating: number | undefined
    const ratingRaw = parsed.data.personal_rating
    if (typeof ratingRaw === "number") {
      personalRating = ratingRaw
    } else if (typeof ratingRaw === "string") {
      const parsed_rating = parseFloat(ratingRaw)
      if (!Number.isNaN(parsed_rating)) personalRating = parsed_rating
    }

    // Extract item_type if present
    const itemTypeRaw = parsed.data.item_type
    const itemType =
      typeof itemTypeRaw === "string" && itemTypeRaw.trim().length > 0
        ? itemTypeRaw.trim()
        : undefined

    const updatedRaw = (parsed.data.updated as unknown) ?? null
    let updatedTS = 0
    if (typeof updatedRaw === "string") {
      const t = Date.parse(updatedRaw)
      updatedTS = Number.isNaN(t) ? 0 : t
    } else if (updatedRaw instanceof Date) {
      const t = updatedRaw.getTime()
      updatedTS = Number.isNaN(t) ? 0 : t
    } else if (typeof updatedRaw === "number") {
      updatedTS = updatedRaw
    }

    // Record metadata for folder index generation
    const folderRel = path.dirname(path.relative(destRoot, dest)).replace(/\\/g, "/")
    const srcFolderRel = path.dirname(path.relative(sourceRoot, file)).replace(/\\/g, "/")
    const collectionRoot = isInCollection(srcFolderRel, collectionFolders)

    // Track title from files with collectionIndexOnly frontmatter
    const isCollectionIndexFile = isIndexFile
    if (isCollectionIndexFile && collectionRoot) {
      folderIndexTitles.set(srcFolderRel, title)
    }
    const meta: NoteMeta = {
      title,
      destPath: dest,
      folderRel,
      srcFolderRel,
      mode,
      externalUrl,
      updatedTS,
      collectionRoot: collectionRoot || undefined,
      personalRating,
      itemType,
    }

    // Add to both the actual folder and the collection root (if different).
    // Unlisted items (status not in LISTED_STATUSES) are skipped here: a `full` one still gets its
    // page written below, it just does not appear in the collection index.
    if (listed) {
      const arr = folderNotes.get(folderRel) ?? []
      arr.push(meta)
      folderNotes.set(folderRel, arr)

      if (collectionRoot && collectionRoot !== folderRel) {
        const rootArr = folderNotes.get(collectionRoot) ?? []
        rootArr.push(meta)
        folderNotes.set(collectionRoot, rootArr)
      }
    }

    await fs.promises.mkdir(path.dirname(dest), { recursive: true })

    const srcCollectionRoot = isInCollection(srcFolderRel, collectionFolders)
    const isCollectionFolder = srcCollectionRoot !== null

    if (mode === "full" || !isCollectionFolder) {
      // Skip writing files with collectionIndexOnly in collection folders - they will be regenerated
      if (!(isCollectionFolder && isCollectionIndexFile)) {
        // Remove AI-generated sections, private notes blocks, local-scheme links, and HTML comments
        const filteredContent = removeHtmlComments(
          removeLocalLinks(removePrivateNotes(removeAiGeneratedSections(parsed.content))),
        )
        const filteredFileContent = matter.stringify(filteredContent, parsed.data)
        await fs.promises.writeFile(dest, filteredFileContent, "utf8")
        publishedCount += 1
        publishedNotePaths.push(dest) // Track this file for wikilink replacement
      }
    } else {
      // Do not create a note file for title/external modes
    }

    // Auto-detect asset references from note content (only for full mode)
    if (mode === "full") {
      const detectedRefs = extractAssetRefsFromContent(contents)
      for (const assetRef of detectedRefs) {
        const resolved = await resolveAssetPath(assetRef, ignoreGlobs)
        if (!resolved) continue
        const destPath = path.join(destAssetRoot, assetRef)
        assetsToCopy.set(resolved, destPath)
      }
    }

    // For tag index generation: only use the last folder segment as the canonical tag
    const folderSegs = folderRel.split("/").filter(Boolean)
    const canonicalTag = folderSegs.length > 0 ? folderSegs[folderSegs.length - 1] : ""
    if (canonicalTag && isCollectionFolder && listed) {
      // Exclude folder index.md from tag aggregation to keep counts aligned
      if (path.basename(dest).toLowerCase() !== "index.md") {
        // Use the collection root's last segment as the tag, not the nested folder's
        const tagToUse = collectionRoot
          ? collectionRoot.split("/").pop() || canonicalTag
          : canonicalTag
        const arrT = tagNotes.get(tagToUse) ?? []
        arrT.push(meta)
        tagNotes.set(tagToUse, arrT)
      }
    }

    // (Removed) Do not add all frontmatter tags to tagNotes — we only use canonicalTag
  }

  for (const [src, dest] of assetsToCopy.entries()) {
    await copyFile(src, dest)
    assetCount += 1
  }

  console.log(
    `📄 Copied ${publishedCount} publish:true notes and ${assetCount} referenced assets into ${destRoot}`,
  )
  console.log(
    `🚫 Excluded ${unlistedCount} collection items whose status is not one of ${Array.from(LISTED_STATUSES).join(", ")}`,
  )

  // Replace wikilinks with external URLs in all published notes
  if (externalUrlMap.size > 0) {
    let replacedCount = 0
    for (const notePath of publishedNotePaths) {
      const content = await fs.promises.readFile(notePath, "utf8")
      const parsed = matter(content)
      const updatedContent = replaceWikilinksWithExternal(parsed.content, externalUrlMap)

      // Only rewrite if content changed
      if (updatedContent !== parsed.content) {
        const updatedFileContent = matter.stringify(updatedContent, parsed.data)
        await fs.promises.writeFile(notePath, updatedFileContent, "utf8")
        replacedCount += 1
      }
    }
    console.log(
      `🔗 Replaced wikilinks with external URLs in ${replacedCount} files (${externalUrlMap.size} external notes)`,
    )
  }

  // Generate folder indexes for collection folders
  for (const [folderRel, notes] of folderNotes.entries()) {
    const shouldGenerate = notes.some(
      (n) => isInCollection(n.srcFolderRel, collectionFolders) !== null,
    )
    if (!shouldGenerate) continue

    const folderDir = path.join(destRoot, folderRel)

    // Use title from original index.md if available, otherwise use folder name
    const indexTitle = folderIndexTitles.get(folderRel)
    const segments = folderRel.split("/").filter(Boolean)
    const fallbackTitle = segments.length > 0 ? segments[segments.length - 1] : "Index"
    const title = indexTitle || fallbackTitle

    // Generate filename from title, sanitized
    const indexFilename = indexTitle ? `${sanitizeFilename(indexTitle)}.md` : "index.md"
    const indexPath = path.join(folderDir, indexFilename)

    // Extract tags from folder path (all segments become tags)
    const tags = segments.length > 0 ? segments : []

    const itemCount = await generateCollectionIndex(indexPath, folderDir, title, notes, indexPath, {
      tags,
    })
    folderIndexCount += 1
    folderIndexItemsTotal += itemCount
    console.log(`📁 Created folder index '${folderRel}/${indexFilename}' with ${itemCount} items`)
  }

  // Generate tag pages for collection tags
  // for (const [tagName, notes] of tagNotes.entries()) {
  //   const tagFilePath = path.join(destRoot, "tags", `${tagName}.md`)
  //   const hasTagFile = await pathExists(tagFilePath)
  //   if (hasTagFile) continue

  //   const tagDir = path.dirname(tagFilePath)
  //   const itemCount = await generateCollectionIndex(
  //     tagFilePath,
  //     tagDir,
  //     tagName,
  //     notes,
  //     undefined,
  //     { tags: [tagName] },
  //   )
  //   tagIndexCount += 1
  //   tagIndexItemsTotal += itemCount
  //   console.log(`🏷️ Created tag page '${tagName}' with ${itemCount} items`)
  // }

  // Summary logs
  if (fixedRoot) {
    if (path.resolve(fixedRoot) === path.resolve(destRoot)) {
      console.warn("⚠️  'fixed' folder equals destination; skipping fixed-content merge.")
    } else if (!(await pathExists(fixedRoot))) {
      console.warn(`⚠️  Fixed folder '${fixedRoot}' not found; skipping merge.`)
    } else {
      const fixedCopied = await copyDirectoryContents(fixedRoot, destRoot)
      console.log(`📦 Merged ${fixedCopied} files from ${fixedRoot} into ${destRoot}`)
    }
  }

  console.log(
    `📁 Folder indexes created: ${folderIndexCount} (total items: ${folderIndexItemsTotal})`,
  )
  console.log(`🏷️ Tag pages created: ${tagIndexCount} (total items: ${tagIndexItemsTotal})`)
}

sync().catch((err) => {
  console.error(err)
  process.exit(1)
})
