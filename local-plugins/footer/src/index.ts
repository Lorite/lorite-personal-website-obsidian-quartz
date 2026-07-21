// Component-only plugin: Quartz's config-loader only registers a plugin's components when the
// plugin declares NO processing category (transformer/filter/emitter/pageType) — see
// config-loader.ts, where loadComponentsFromPackage() lives in the `else` branch. The Font Awesome
// stylesheet the icon classes need is therefore injected by the separate ./local-plugins/icon-fonts
// transformer rather than from here.
export { Footer, default } from "./components/Footer"
export type { FooterLink, FooterOptions } from "./components/Footer"
