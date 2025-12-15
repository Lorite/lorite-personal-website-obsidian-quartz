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
    default: "assets",
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

async function pathExists(fp: string) {
  try {
    await fs.promises.access(fp, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveAssetPath(assetRef: string): Promise<string | null> {
  const cleanedRef = normalizePathFragment(normalizeAssetRef(assetRef))
  const directPath = path.join(sourceRoot, cleanedRef)
  if (await pathExists(directPath)) return directPath

  const matches = await globby([`**/${path.basename(cleanedRef)}`], {
    cwd: sourceRoot,
    absolute: true,
    ignore: argv.ignore as string[],
  })

  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    console.warn(`⚠️  Multiple matches for asset '${cleanedRef}', skipping to avoid ambiguity.`)
  } else {
    console.warn(`⚠️  Asset '${cleanedRef}' not found under ${sourceRoot}.`)
  }
  return null
}

function resolveNoteDestination(srcFile: string, frontmatterPath?: unknown) {
  const rel = path.relative(sourceRoot, srcFile)
  if (typeof frontmatterPath === "string" && frontmatterPath.length > 0) {
    const normalized = normalizePathFragment(frontmatterPath)
    if (normalized.endsWith(".md")) {
      return path.join(destRoot, normalized)
    }
    return path.join(destRoot, normalized, path.basename(srcFile))
  }
  return path.join(destRoot, rel)
}

async function copyFile(src: string, dest: string) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.copyFile(src, dest)
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

  const markdownFiles = await globby(["**/*.md"], {
    cwd: sourceRoot,
    absolute: true,
    ignore: argv.ignore as string[],
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

    if (Array.isArray(parsed.data.assets)) {
      for (const assetRef of parsed.data.assets) {
        if (typeof assetRef !== "string") continue
        const resolved = await resolveAssetPath(assetRef)
        if (!resolved) continue
        const cleanedRef = normalizePathFragment(normalizeAssetRef(assetRef))
        const destPath = path.join(destAssetRoot, cleanedRef)
        assetsToCopy.set(resolved, destPath)
      }
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
