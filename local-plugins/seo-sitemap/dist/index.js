// local-plugins/seo-sitemap/src/index.ts
import fs from "node:fs";
import path from "node:path";

// local-plugins/seo-metadata/src/noindex.ts
function compileNoindexPatterns(sources) {
  return sources.map((p) => new RegExp(p));
}
function isNoindexed(slug, text, patterns, minWords) {
  if (slug === "404") return false;
  if (!patterns.some((re) => re.test(slug))) return false;
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return words < minWords;
}

// local-plugins/seo-sitemap/src/index.ts
var DEFAULTS = {
  noindexPatterns: [],
  noindexMinWords: 25
};
function absoluteUrl(origin, slug) {
  const trimmed = slug.replace(/(^|\/)index$/, "$1");
  return new URL(trimmed, origin).href;
}
function pageDate(data) {
  const dates = data.dates;
  return dates?.modified ?? dates?.published ?? dates?.created ?? /* @__PURE__ */ new Date();
}
var SeoSitemap = (opts) => {
  const cfg = { ...DEFAULTS, ...opts ?? {} };
  return {
    name: "SeoSitemap",
    async emit(ctx, content) {
      const origin = new URL(`https://${ctx.cfg.configuration.baseUrl ?? "example.com"}`);
      const patterns = compileNoindexPatterns(cfg.noindexPatterns);
      const entries = [];
      for (const [, file] of content) {
        const data = file.data ?? {};
        const slug = data.slug;
        if (!slug) continue;
        if (slug === "404") continue;
        if (data.unlisted === true) continue;
        if (isNoindexed(slug, data.text, patterns, cfg.noindexMinWords)) {
          continue;
        }
        const loc = absoluteUrl(origin, slug);
        const lastmod = pageDate(data).toISOString();
        entries.push(`<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`);
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`;
      const out = path.join(ctx.argv.output, "sitemap.xml");
      await fs.promises.mkdir(path.dirname(out), { recursive: true });
      await fs.promises.writeFile(out, xml);
      return [out];
    },
    async partialEmit() {
      return null;
    }
  };
};
var index_default = SeoSitemap;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
