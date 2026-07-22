#!/usr/bin/env node
/**
 * Generate an `index.html` redirect in each Quarto slide folder that lacks one.
 *
 * A Quarto/reveal.js deck exports as `slides/<deck>/<deck>.html` plus a `<deck>_files/` folder — there
 * is no `index.html`, so the bare directory URL `/static/slides/<deck>/` has nothing to serve and 404s
 * (only the full `/static/slides/<deck>/<deck>.html` works). This writes a tiny redirect index so the
 * folder URL lands on the deck too. Runs after `quartz build`, over the emitted `public/static/slides`.
 *
 * For each immediate subfolder with no index.html and exactly one top-level `.html`, it writes an
 * index.html that redirects to that file. Folders that already have an index.html, or that have zero or
 * several top-level HTML files (ambiguous), are left untouched.
 */
import fs from "node:fs"
import path from "node:path"

const slidesDir = process.argv[2] ?? path.join("public", "static", "slides")

if (!fs.existsSync(slidesDir)) {
  console.log(`No slides directory at ${slidesDir}; nothing to do.`)
  process.exit(0)
}

let created = 0
for (const entry of fs.readdirSync(slidesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const dir = path.join(slidesDir, entry.name)

  if (fs.existsSync(path.join(dir, "index.html"))) continue

  const htmlFiles = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".html"))
    .map((e) => e.name)

  if (htmlFiles.length !== 1) {
    if (htmlFiles.length === 0) {
      console.warn(`⚠️  ${entry.name}: no top-level .html, skipping`)
    } else {
      console.warn(
        `⚠️  ${entry.name}: ${htmlFiles.length} top-level .html files, skipping (ambiguous)`,
      )
    }
    continue
  }

  const target = htmlFiles[0]
  const encoded = encodeURI(target)
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./${encoded}" />
    <link rel="canonical" href="./${encoded}" />
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting to <a href="./${encoded}">${target}</a>…</p>
  </body>
</html>
`
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8")
  created += 1
  console.log(`📽️  ${entry.name}/index.html → ${target}`)
}

console.log(`Generated ${created} slide index redirect(s).`)
