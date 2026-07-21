#!/usr/bin/env node
/**
 * Build the local Quartz v5 plugins in `local-plugins/` into their committed `dist/` output.
 *
 * Why this exists: Quartz v5 plugins are normally standalone git repos built with `tsup` and their
 * own `node_modules`. For the handful of personal components ported from Quartz v4 that's a lot of
 * overhead, so instead each plugin is referenced from quartz.config.yaml by a LOCAL path
 * (`source: ./local-plugins/<name>`), which Quartz symlinks into `.quartz/plugins/<name>`.
 *
 * Crucially, the loader uses a plugin's `dist/` as-is when it exists and is not gitignored
 * (`hasPrebuiltDist`), skipping `npm install` + `npm run build` entirely. So we commit `dist/` and
 * build it here with the root's esbuild — no per-plugin toolchain, and no network needed when the
 * Docker image or CI runs `npx quartz plugin install`.
 *
 * Mirrors the JSX/loader settings the community plugins' tsup config uses:
 *   jsx: automatic + preact, ESM, es2022, bundled except the singleton peers.
 *
 * NOTE: esbuild does not emit type declarations, so each plugin's `dist/*.d.ts` files are small and
 * hand-maintained (this script only ever writes `index.js`/`.map`, so they survive rebuilds). If you
 * change a plugin's public options, update its `dist/index.d.ts` and `dist/components/index.d.ts` too.
 */
import fs from "node:fs"
import path from "node:path"
import * as esbuild from "esbuild"

const PLUGINS_ROOT = path.resolve("local-plugins")

// Must stay external so the plugin shares the host's single instance (same list as the community
// plugins' tsup SINGLETON_EXTERNALS).
const SINGLETON_EXTERNALS = [
  "preact",
  "preact/hooks",
  "preact/jsx-runtime",
  "preact/compat",
  "@quartz-community/types",
  "@quartz-community/utils",
  "@jackyzha0/quartz",
  "@jackyzha0/quartz/*",
  "vfile",
  "vfile/*",
  "unified",
]

/** Bundles `*.inline.ts` client-side scripts to an IIFE string, the way Quartz expects them. */
const inlineScriptPlugin: esbuild.Plugin = {
  name: "inline-script-loader",
  setup(build) {
    build.onLoad({ filter: /\.inline\.ts$/ }, async (args) => {
      const result = await esbuild.build({
        entryPoints: [args.path],
        bundle: true,
        write: false,
        format: "iife",
        target: "es2022",
        platform: "browser",
      })
      const code = result.outputFiles?.[0]?.text ?? ""
      return { contents: `export default ${JSON.stringify(code)};`, loader: "ts" }
    })
  },
}

function findEntry(pluginDir: string, base: string): string | null {
  for (const ext of [".tsx", ".ts"]) {
    const fp = path.join(pluginDir, base + ext)
    if (fs.existsSync(fp)) return fp
  }
  return null
}

async function buildPlugin(name: string): Promise<boolean> {
  const pluginDir = path.join(PLUGINS_ROOT, name)

  // Quartz loads components from the "./components" export subpath (componentLoader.ts), so build
  // both the main entry and the components entry, mirroring the community plugins' tsup setup.
  const entries: Array<{ entry: string; out: string }> = []
  const main = findEntry(pluginDir, "src/index")
  if (main) entries.push({ entry: main, out: path.join(pluginDir, "dist", "index.js") })
  const components = findEntry(pluginDir, "src/components/index")
  if (components) {
    entries.push({ entry: components, out: path.join(pluginDir, "dist", "components", "index.js") })
  }

  if (entries.length === 0) {
    console.warn(`⚠️  ${name}: no src/index.{ts,tsx} or src/components/index.{ts,tsx}, skipping`)
    return false
  }

  for (const { entry, out } of entries) {
    await esbuild.build({
      entryPoints: [entry],
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      sourcemap: true,
      treeShaking: true,
      jsx: "automatic",
      jsxImportSource: "preact",
      external: SINGLETON_EXTERNALS,
      // Styles are plain CSS (no sass dependency); Quartz takes component CSS as a string.
      loader: { ".css": "text" },
      plugins: [inlineScriptPlugin],
      logLevel: "warning",
    })
  }

  console.log(`✓ ${name}: built ${entries.map((e) => path.relative(pluginDir, e.out)).join(", ")}`)
  return true
}

async function main() {
  if (!fs.existsSync(PLUGINS_ROOT)) {
    console.log("No local-plugins/ directory; nothing to build.")
    return
  }

  const names = fs
    .readdirSync(PLUGINS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  if (names.length === 0) {
    console.log("No local plugins found.")
    return
  }

  let built = 0
  for (const name of names) {
    if (await buildPlugin(name)) built += 1
  }
  console.log(`\nBuilt ${built}/${names.length} local plugin(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
