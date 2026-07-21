// esbuild loads .css files with the `text` loader and bundles *.inline.ts to an IIFE string
// (see scripts/build-local-plugins.ts), so both imports yield strings.
declare module "*.css" {
  const content: string
  export default content
}

declare module "*.inline" {
  const script: string
  export default script
}
