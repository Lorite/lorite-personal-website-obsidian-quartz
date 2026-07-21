#!/usr/bin/env node
/**
 * Static file server for the built site.
 *
 * Replaces `http-server`, which 404s parent tag pages. Quartz emits a tag page as a flat file
 * (`tags/engineering.html`) while ALSO creating a directory of the same name for its child tags
 * (`tags/engineering/robotics.html`). Asked for `/tags/engineering`, http-server sees the directory
 * first, 302s to `/tags/engineering/`, finds no `index.html` there and returns 404 — so every tag
 * that has sub-tags was unreachable, even though its page had been built correctly.
 *
 * `serve-handler` resolves `/tags/engineering` to `tags/engineering.html` instead. It's what Quartz's
 * own dev server uses (quartz/cli/handlers.js), which is why the same URLs worked under
 * `quartz build --serve` but not in the container. Using it here keeps production and dev identical.
 */
import http from "node:http"
import serveHandler from "serve-handler"

const port = Number(process.env.PORT ?? 3000)
const root = process.argv[2] ?? "public"

// Mirrors the options Quartz uses for its own preview server.
const options = {
  public: root,
  directoryListing: false,
  headers: [
    {
      source: "**/*.*",
      headers: [{ key: "Content-Disposition", value: "inline" }],
    },
    {
      source: "**/*.webp",
      headers: [{ key: "Content-Type", value: "image/webp" }],
    },
    // fixes bug where avif images are displayed as text instead of images (future proof)
    {
      source: "**/*.avif",
      headers: [{ key: "Content-Type", value: "image/avif" }],
    },
  ],
}

const server = http.createServer((req, res) => serveHandler(req, res, options))

server.listen(port, () => {
  console.log(`Serving ${root} on http://0.0.0.0:${port}`)
})
