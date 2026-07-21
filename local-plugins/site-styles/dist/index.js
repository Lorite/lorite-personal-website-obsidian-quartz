// local-plugins/site-styles/src/site.css
var site_default = `/*
 * Site-wide CSS tweaks. In Quartz v4 these lived in the forked quartz/styles/base.scss; v5's core
 * styles aren't forkable, so they're injected as an inline stylesheet by this plugin.
 */

/* ---------------------------------------------------------------------------
 * Left sidebar panel sizing.
 *
 * The left sidebar is a flex column. Recent Notes has no height cap, so with 10
 * entries it grew to ~870px, consumed the column and flex-squashed the Tag
 * Explorer to a rendered height of 0 (its scrollHeight was still ~980px, i.e.
 * fully rendered but with no room). Cap the tall panels and stop them being
 * crushed, so every panel keeps a usable share and scrolls internally.
 * ------------------------------------------------------------------------- */
.left.sidebar > * {
  /* flex items default to min-height:auto, which prevents internal scrolling */
  min-height: 0;
}

.left.sidebar .recent-notes {
  max-height: 20rem;
  overflow-y: auto;
  flex: 0 1 auto;
}

/* The community Recent Notes has no option to hide the per-entry date, and it costs a line of
   height each. The sidebar list is about "what changed recently", not exact dates. */
.left.sidebar .recent-notes .meta {
  display: none;
}

.left.sidebar .explorer {
  flex: 0 1 auto;
}

/* ---------------------------------------------------------------------------
 * Ported from the v4 base.scss customizations.
 * ------------------------------------------------------------------------- */

/* Responsive site title: scale with the viewport and ellipsize rather than wrapping or
   overflowing on narrow screens (v4 commit 42dadba). */
.page-title {
  font-size: clamp(1rem, 5vw, 1.75rem);
}

.page-title a {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Anchor links shouldn't land under the mobile header. */
@media all and (max-width: 800px) {
  html {
    scroll-padding-top: 4rem;
  }
}

/* Use the theme's textHighlight for selection rather than a mix of --tertiary. */
::selection {
  background: var(--textHighlight);
  color: var(--darkgray);
}
`;

// local-plugins/site-styles/src/index.tsx
import { jsx } from "preact/jsx-runtime";
var SiteStyles = (opts) => {
  const css = [site_default, opts?.extraCss ?? ""].filter(Boolean).join("\n");
  const author = opts?.author ?? "";
  return {
    name: "SiteStyles",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds resources.
    htmlPlugins() {
      return [];
    },
    externalResources() {
      const resources = {};
      if (css.trim()) {
        resources.css = [{ content: css, inline: true, spaPreserve: true }];
      }
      if (author) {
        resources.additionalHead = [/* @__PURE__ */ jsx("meta", { name: "author", content: author }, "site-author")];
      }
      return resources;
    }
  };
};
var index_default = SiteStyles;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
