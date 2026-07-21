// Component-only plugin (declaring a processing category would stop Quartz registering components —
// see the note in ./local-plugins/footer/src/index.ts).
export { TagExplorer, default } from "./components/TagExplorer"
export type { TagExplorerOptions } from "./components/TagExplorer"
