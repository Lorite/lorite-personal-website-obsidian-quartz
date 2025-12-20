#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { globby } from "globby"
import matter from "gray-matter"
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
  .help()
  .parseSync()

const sourceRoot = path.resolve(argv.source)
const destRoot = path.resolve(argv.dest)
const destAssetRoot = path.join(destRoot, argv.assets)

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
  const configPath = path.resolve(process.cwd(), "quartz.config.ts")
  if (!(await pathExists(configPath))) return []
  try {
    const content = await fs.promises.readFile(configPath, "utf8")
    // Find `ignorePatterns: [ ... ]` and extract all quoted strings inside
    const match = content.match(/ignorePatterns\s*:\s*\[([\s\S]*?)\]/)
    if (!match) return []
    const inside = match[1]
    const strings: string[] = []
    const re = /(["'`])((?:\\\1|.)*?)\1/g
    let m: RegExpExecArray | null
    while ((m = re.exec(inside)) !== null) {
      strings.push(m[2])
    }
    return strings
  } catch (e) {
    console.warn("⚠️  Could not read ignorePatterns from quartz.config.ts:", (e as Error).message)
    return []
  }
}

// Load folders that opt into collection index-only behavior via frontmatter in their source index.md
async function loadCollectionFolders(
  sourceRoot: string,
  ignoreGlobs: string[],
): Promise<Set<string>> {
  const collection = new Set<string>()
  const indexFiles = await globby(["**/index.md"], {
    cwd: sourceRoot,
    absolute: true,
    ignore: ignoreGlobs,
  })
  for (const fp of indexFiles) {
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
      console.warn(`⚠️  Failed to read index.md for collection check: ${fp}`, (e as Error).message)
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
  let folderIndexCount = 0
  let folderIndexItemsTotal = 0
  let tagIndexCount = 0
  let tagIndexItemsTotal = 0

  type NoteMeta = {
    title: string
    destPath: string
    folderRel: string
    srcFolderRel: string
    mode: "full" | "title" | "external"
    externalUrl?: string
    updatedTS: number
    collectionRoot?: string
  }
  const folderNotes = new Map<string, NoteMeta[]>()
  const tagNotes = new Map<string, NoteMeta[]>()

  for (const file of markdownFiles) {
    const contents = await fs.promises.readFile(file, "utf8")
    const parsed = matter(contents)

    if (!shouldPublish(parsed.data.publish)) continue

    const mode: "full" | "title" | "external" = (parsed.data.publish_mode as any) ?? "full"
    const externalUrl = typeof parsed.data.url === "string" ? parsed.data.url : undefined

    const dest = resolveNoteDestination(file, parsed.data.path)
    const title = (parsed.data.title as string) ?? path.parse(file).name
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
    const meta: NoteMeta = {
      title,
      destPath: dest,
      folderRel,
      srcFolderRel,
      mode,
      externalUrl,
      updatedTS,
      collectionRoot: collectionRoot || undefined,
    }

    // Add to both the actual folder and the collection root (if different)
    const arr = folderNotes.get(folderRel) ?? []
    arr.push(meta)
    folderNotes.set(folderRel, arr)

    if (collectionRoot && collectionRoot !== folderRel) {
      const rootArr = folderNotes.get(collectionRoot) ?? []
      rootArr.push(meta)
      folderNotes.set(collectionRoot, rootArr)
    }

    await fs.promises.mkdir(path.dirname(dest), { recursive: true })

    const srcCollectionRoot = isInCollection(srcFolderRel, collectionFolders)
    const isCollectionFolder = srcCollectionRoot !== null

    if (mode === "full" || !isCollectionFolder) {
      // Remove private notes blocks from the content
      const filteredContent = removePrivateNotes(parsed.content)
      const filteredFileContent = matter.stringify(filteredContent, parsed.data)
      await fs.promises.writeFile(dest, filteredFileContent, "utf8")
      publishedCount += 1
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
    if (canonicalTag && isCollectionFolder) {
      // Exclude folder index.md from tag aggregation to keep counts aligned
      if (path.basename(dest).toLowerCase() !== "index.md") {
        const arrT = tagNotes.get(canonicalTag) ?? []
        arrT.push(meta)
        tagNotes.set(canonicalTag, arrT)
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

  // Generate index.md for each folder with published items if none exists
  for (const [folderRel, notes] of folderNotes.entries()) {
    const folderDir = path.join(destRoot, folderRel)
    const indexPath = path.join(folderDir, "index.md")
    // Only generate index for folders that opt into collection behavior
    const shouldGenerate = notes.some(
      (n) => isInCollection(n.srcFolderRel, collectionFolders) !== null,
    )
    if (!shouldGenerate) continue

    // Title: use last path segment or root name
    const segments = folderRel.split("/").filter(Boolean)
    const title = segments.length > 0 ? segments[segments.length - 1] : "Index"

    // Build markdown list
    const lines: string[] = []
    lines.push(`List of ${title.toLowerCase()} I have consumed from newest to oldest:`)
    lines.push("")
    // Sort notes newest-to-oldest by 'updated' frontmatter
    const sortedNotes = notes.slice().sort((a, b) => (b.updatedTS || 0) - (a.updatedTS || 0))
    const listNotes = sortedNotes.filter(
      (n) => path.normalize(n.destPath).toLowerCase() !== path.normalize(indexPath).toLowerCase(),
    )
    for (const n of listNotes) {
      if (n.mode === "external" && n.externalUrl) {
        lines.push(`- [${n.title}](${n.externalUrl})`)
      } else if (n.mode === "full") {
        // Use absolute path from site root (/media/boardgames/note instead of ../../note)
        const absPath =
          "/" +
          n.destPath
            .replace(destRoot + "/", "")
            .replace(/\\/g, "/")
            .replace(/\.md$/i, "")
        lines.push(`- [${n.title}](${absPath})`)
      } else {
        // title-only: show plain text entry
        lines.push(`- ${n.title}`)
      }
    }

    const content = lines.join("\n")
    const fm = { title, publish: true }
    const fileOut = matter.stringify(content, fm)
    await fs.promises.mkdir(folderDir, { recursive: true })
    await fs.promises.writeFile(indexPath, fileOut, "utf8")
    folderIndexCount += 1
    folderIndexItemsTotal += listNotes.length
    console.log(`📁 Created folder index '${folderRel}' with ${listNotes.length} items`)
  }

  // (Removed) Old tag page generation using each frontmatter tag

  // Generate tag pages (tags/<tag>.md) with lists using canonical last-folder tag
  for (const [tagName, notes] of tagNotes.entries()) {
    const tagFilePath = path.join(destRoot, "tags", `${tagName}.md`)
    const tagDir = path.dirname(tagFilePath)
    const hasTagFile = await pathExists(tagFilePath)
    if (hasTagFile) continue

    const title = tagName

    const lines: string[] = []
    lines.push(`List of ${tagName.toLowerCase()} I have consumed from newest to oldest:`)
    lines.push("")
    // Sort notes newest-to-oldest by 'updated' frontmatter
    const sortedNotes = notes.slice().sort((a, b) => (b.updatedTS || 0) - (a.updatedTS || 0))
    // Exclude any folder index.md entries
    const listNotes = sortedNotes.filter(
      (n) => path.basename(n.destPath).toLowerCase() !== "index.md",
    )
    for (const n of listNotes) {
      if (n.mode === "external" && n.externalUrl) {
        lines.push(`- [${n.title}](${n.externalUrl})`)
      } else if (n.mode === "full") {
        // Use absolute path from site root
        const absPath =
          "/" +
          n.destPath
            .replace(destRoot + "/", "")
            .replace(/\\/g, "/")
            .replace(/\.md$/i, "")
        lines.push(`- [${n.title}](${absPath})`)
      } else {
        lines.push(`- ${n.title}`)
      }
    }

    const content = lines.join("\n")
    const fm = { title, publish: true, tags: [tagName] }
    const fileOut = matter.stringify(content, fm)
    await fs.promises.mkdir(tagDir, { recursive: true })
    await fs.promises.writeFile(tagFilePath, fileOut, "utf8")
    tagIndexCount += 1
    tagIndexItemsTotal += listNotes.length
    console.log(`🏷️ Created tag page '${tagName}' with ${listNotes.length} items`)
  }

  // Summary logs
  console.log(
    `📁 Folder indexes created: ${folderIndexCount} (total items: ${folderIndexItemsTotal})`,
  )
  console.log(`🏷️ Tag pages created: ${tagIndexCount} (total items: ${tagIndexItemsTotal})`)
}

sync().catch((err) => {
  console.error(err)
  process.exit(1)
})
