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

async function sync() {
  if (!(await pathExists(sourceRoot))) {
    console.error(`Source folder '${sourceRoot}' does not exist.`)
    process.exit(1)
  }

  if (argv.clean) {
    await fs.promises.rm(destRoot, { recursive: true, force: true })
  }
  await fs.promises.mkdir(destRoot, { recursive: true })

  // Build ignore globs by merging CLI ignores with Quartz config ignorePatterns
  const cliIgnore = (argv.ignore as string[]) ?? []
  const quartzIgnores = await loadQuartzIgnorePatterns()
  const ignoreGlobs = Array.from(
    new Set([...expandIgnorePatterns(cliIgnore), ...expandIgnorePatterns(quartzIgnores)]),
  )

  const markdownFiles = await globby(["**/*.md"], {
    cwd: sourceRoot,
    absolute: true,
    ignore: ignoreGlobs,
  })

  let publishedCount = 0
  let assetCount = 0
  const assetsToCopy = new Map<string, string>()

  for (const file of markdownFiles) {
    const contents = await fs.promises.readFile(file, "utf8")
    const parsed = matter(contents)

    if (!shouldPublish(parsed.data.publish)) continue

    const dest = resolveNoteDestination(file, parsed.data.path)
    await copyFile(file, dest)
    publishedCount += 1

    // Auto-detect asset references from note content
    const detectedRefs = extractAssetRefsFromContent(contents)
    for (const assetRef of detectedRefs) {
      const resolved = await resolveAssetPath(assetRef, ignoreGlobs)
      if (!resolved) continue
      const destPath = path.join(destAssetRoot, assetRef)
      assetsToCopy.set(resolved, destPath)
    }
  }

  for (const [src, dest] of assetsToCopy.entries()) {
    await copyFile(src, dest)
    assetCount += 1
  }

  console.log(
    `Copied ${publishedCount} publish:true notes and ${assetCount} referenced assets into ${destRoot}`,
  )
}

sync().catch((err) => {
  console.error(err)
  process.exit(1)
})
