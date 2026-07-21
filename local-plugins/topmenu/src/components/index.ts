// Quartz v5 loads a plugin's components from its "./components" export subpath
// (see quartz/plugins/loader/componentLoader.ts). Export names must match the
// `quartz.components` keys in package.json.
export { TopMenu, default } from "./TopMenu"
export type { TopMenuLink, TopMenuOptions } from "./TopMenu"
