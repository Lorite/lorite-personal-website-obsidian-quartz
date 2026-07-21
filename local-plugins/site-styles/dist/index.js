// local-plugins/site-styles/src/site.css
var site_default = "/*\n * Site-wide CSS tweaks. In Quartz v4 these lived in the forked quartz/styles/base.scss; v5's core\n * styles aren't forkable, so they're injected as an inline stylesheet by this plugin.\n */\n\n/* ---------------------------------------------------------------------------\n * Left sidebar panel sizing.\n *\n * The left sidebar is a flex column. Recent Notes has no height cap, so with 10\n * entries it grew to ~870px, consumed the column and flex-squashed the Tag\n * Explorer to a rendered height of 0 (its scrollHeight was still ~980px, i.e.\n * fully rendered but with no room). Cap the tall panels and stop them being\n * crushed, so every panel keeps a usable share and scrolls internally.\n * ------------------------------------------------------------------------- */\n.left.sidebar > * {\n  /* flex items default to min-height:auto, which prevents internal scrolling */\n  min-height: 0;\n}\n\n.left.sidebar .recent-notes {\n  max-height: 20rem;\n  overflow-y: auto;\n  flex: 0 1 auto;\n}\n\n.left.sidebar .explorer {\n  flex: 0 1 auto;\n}\n\n/* ---------------------------------------------------------------------------\n * Ported from the v4 base.scss customizations.\n * ------------------------------------------------------------------------- */\n\n/* Anchor links shouldn't land under the mobile header. */\n@media all and (max-width: 800px) {\n  html {\n    scroll-padding-top: 4rem;\n  }\n}\n\n/* Use the theme's textHighlight for selection rather than a mix of --tertiary. */\n::selection {\n  background: var(--textHighlight);\n  color: var(--darkgray);\n}\n";

// local-plugins/site-styles/src/index.ts
var SiteStyles = (opts) => {
  const css = [site_default, opts?.extraCss ?? ""].filter(Boolean).join("\n");
  return {
    name: "SiteStyles",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS.
    htmlPlugins() {
      return [];
    },
    externalResources() {
      if (!css.trim()) return {};
      return {
        css: [{ content: css, inline: true, spaPreserve: true }]
      };
    }
  };
};
var index_default = SiteStyles;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
