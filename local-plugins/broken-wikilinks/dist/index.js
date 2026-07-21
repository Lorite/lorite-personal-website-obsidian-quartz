// local-plugins/broken-wikilinks/src/index.ts
function hasBrokenClass(node) {
  const className = node.properties?.className;
  if (Array.isArray(className)) return className.includes("broken");
  if (typeof className === "string") return className.split(/\s+/).includes("broken");
  return false;
}
var BrokenWikilinks = (opts) => {
  const action = opts?.onBrokenWikilink ?? "remove";
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
                next.push(...child.children ?? []);
                continue;
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
