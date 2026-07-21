// local-plugins/broken-wikilinks/src/index.ts
var DEFAULT_KEEP_SLUG_PREFIXES = ["static/"];
var DEFAULT_KEEP_CLASSES = ["tag-link"];
function classList(node) {
  const className = node.properties?.className;
  if (Array.isArray(className)) return className.map(String);
  if (typeof className === "string") return className.split(/\s+/);
  return [];
}
function hasBrokenClass(node) {
  return classList(node).includes("broken");
}
var BrokenWikilinks = (opts) => {
  const action = opts?.onBrokenWikilink ?? "remove";
  const keepSlugPrefixes = opts?.keepSlugPrefixes ?? DEFAULT_KEEP_SLUG_PREFIXES;
  const keepClasses = opts?.keepClasses ?? DEFAULT_KEEP_CLASSES;
  const shouldUnwrap = (node) => {
    if (!hasBrokenClass(node)) return false;
    const classes = classList(node);
    if (keepClasses.some((c) => classes.includes(c))) return false;
    const slug = node.properties?.["data-slug"];
    if (typeof slug === "string" && keepSlugPrefixes.some((p) => slug.startsWith(p))) return false;
    return true;
  };
  return {
    name: "BrokenWikilinks",
    htmlPlugins() {
      if (action !== "remove") return [];
      return [
        () => (tree) => {
          const walk = (node) => {
            if (!node.children) return;
            const next = [];
            for (const child of node.children) {
              if (child.type === "element" && child.tagName === "a" && hasBrokenClass(child)) {
                if (shouldUnwrap(child)) {
                  next.push(...child.children ?? []);
                  continue;
                }
                if (child.properties) {
                  child.properties.className = classList(child).filter((c) => c !== "broken");
                }
              }
              walk(child);
              next.push(child);
            }
            node.children = next;
          };
          walk(tree);
        }
      ];
    }
  };
};
var index_default = BrokenWikilinks;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
