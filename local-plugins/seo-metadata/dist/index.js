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

// local-plugins/seo-metadata/src/index.tsx
import { jsx } from "preact/jsx-runtime";
var DEFAULTS = {
  personName: "",
  alternateNames: [],
  jobTitle: "",
  personDescription: "",
  affiliation: null,
  sameAs: [],
  personSlugs: ["index"],
  profilePageSlugs: [],
  emitCanonical: true,
  noindexPatterns: [],
  noindexMinWords: 25
};
function siteOrigin(ctx) {
  return new URL(`https://${ctx.cfg.configuration.baseUrl ?? "example.com"}`);
}
function absoluteUrl(origin, slug) {
  const trimmed = slug.replace(/(^|\/)index$/, "$1");
  return new URL(trimmed, origin).href;
}
function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
var SeoMetadata = (opts) => {
  const cfg = { ...DEFAULTS, ...opts ?? {} };
  return {
    name: "SeoMetadata",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds head tags.
    htmlPlugins() {
      return [];
    },
    externalResources(ctx) {
      const origin = siteOrigin(ctx);
      const personSlugs = new Set(cfg.personSlugs);
      const additionalHead = [];
      const noindexPatterns = compileNoindexPatterns(cfg.noindexPatterns);
      if (noindexPatterns.length) {
        additionalHead.push((fileData) => {
          const slug = fileData.slug;
          if (!slug) return null;
          if (!isNoindexed(slug, fileData.text, noindexPatterns, cfg.noindexMinWords)) return null;
          return /* @__PURE__ */ jsx("meta", { name: "robots", content: "noindex, follow" }, "seo-noindex");
        });
      }
      if (cfg.emitCanonical) {
        additionalHead.push((fileData) => {
          const slug = fileData.slug;
          if (!slug || slug === "404") return null;
          return /* @__PURE__ */ jsx("link", { rel: "canonical", href: absoluteUrl(origin, slug) }, "seo-canonical");
        });
      }
      if (cfg.personName) {
        const personId = new URL("#person", origin).href;
        const websiteId = new URL("#website", origin).href;
        const person = {
          "@type": "Person",
          "@id": personId,
          name: cfg.personName,
          url: origin.href,
          mainEntityOfPage: origin.href
        };
        if (cfg.alternateNames.length) person.alternateName = cfg.alternateNames;
        if (cfg.jobTitle) person.jobTitle = cfg.jobTitle;
        if (cfg.personDescription) person.description = cfg.personDescription;
        if (cfg.affiliation) {
          person.affiliation = {
            "@type": "Organization",
            name: cfg.affiliation.name,
            ...cfg.affiliation.url ? { url: cfg.affiliation.url } : {}
          };
        }
        if (cfg.sameAs.length) person.sameAs = cfg.sameAs;
        const graph = {
          "@context": "https://schema.org",
          "@graph": [
            person,
            {
              "@type": "WebSite",
              "@id": websiteId,
              url: origin.href,
              name: ctx.cfg.configuration.pageTitle ?? cfg.personName,
              author: { "@id": personId },
              publisher: { "@id": personId },
              inLanguage: ctx.cfg.configuration.locale ?? "en-US"
            }
          ]
        };
        const json = safeJsonLd(graph);
        additionalHead.push((fileData) => {
          if (!fileData.slug || !personSlugs.has(fileData.slug)) return null;
          return /* @__PURE__ */ jsx(
            "script",
            {
              type: "application/ld+json",
              dangerouslySetInnerHTML: { __html: json }
            },
            "seo-person-jsonld"
          );
        });
        if (cfg.profilePageSlugs.length) {
          const profileSlugs = new Set(cfg.profilePageSlugs);
          additionalHead.push((fileData) => {
            const slug = fileData.slug;
            if (!slug || !profileSlugs.has(slug)) return null;
            const pageUrl = absoluteUrl(origin, slug);
            const profile = {
              "@context": "https://schema.org",
              "@type": "ProfilePage",
              "@id": `${pageUrl}#profilepage`,
              url: pageUrl,
              // `person` is reused verbatim, `mainEntityOfPage` included. It deliberately still
              // points at the homepage: the two nodes share an `@id`, so overriding it here would
              // have one entity asserting two different canonical pages for itself.
              mainEntity: person
            };
            return /* @__PURE__ */ jsx(
              "script",
              {
                type: "application/ld+json",
                dangerouslySetInnerHTML: { __html: safeJsonLd(profile) }
              },
              "seo-profilepage-jsonld"
            );
          });
        }
      }
      return additionalHead.length ? { additionalHead } : {};
    }
  };
};
var index_default = SeoMetadata;
export {
  compileNoindexPatterns,
  index_default as default,
  isNoindexed
};
//# sourceMappingURL=index.js.map
