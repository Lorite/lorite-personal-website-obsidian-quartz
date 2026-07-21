// esbuild loads .css files with the `text` loader (see scripts/build-local-plugins.ts),
// so a CSS import yields the stylesheet as a string.
declare module "*.css" {
  const content: string
  export default content
}
