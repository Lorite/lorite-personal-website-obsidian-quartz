// local-plugins/tag-explorer/src/components/TagExplorer.tsx
import { classNames, resolveRelative } from "@quartz-community/utils";

// local-plugins/tag-explorer/src/components/tagExplorer.css
var tagExplorer_default = '/* Styled to sit alongside the community Explorer in the sidebar. */\n.tag-explorer {\n  overflow-y: auto;\n  max-height: 30rem;\n}\n\n.tag-explorer h3 {\n  font-size: 1rem;\n  margin: 0 0 0.5rem 0;\n  opacity: 0.85;\n}\n\n.tag-explorer ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.tag-explorer .tag-explorer-list ul {\n  /* indent each nested level, with a guide line like the file explorer */\n  margin-left: 0.6rem;\n  padding-left: 0.6rem;\n  border-left: 1px solid var(--lightgray);\n}\n\n.tag-explorer li {\n  margin: 0.15rem 0;\n}\n\n.tag-explorer a.internal.tag-link {\n  background-color: transparent;\n  padding: 0;\n  border-radius: 0;\n  font-size: 0.95rem;\n}\n\n.tag-explorer .tag-count {\n  margin-left: 0.35rem;\n  font-size: 0.75rem;\n  opacity: 0.55;\n}\n\n.tag-explorer summary {\n  cursor: pointer;\n  list-style: none;\n  display: flex;\n  align-items: center;\n  gap: 0.2rem;\n}\n\n/* Replace the default disclosure triangle with a rotating chevron. */\n.tag-explorer summary::-webkit-details-marker {\n  display: none;\n}\n\n.tag-explorer summary::before {\n  content: "\u203A";\n  display: inline-block;\n  transition: transform 0.15s ease;\n  opacity: 0.6;\n  font-size: 0.9rem;\n}\n\n.tag-explorer details[open] > summary::before {\n  transform: rotate(90deg);\n}\n';

// local-plugins/tag-explorer/src/components/TagExplorer.tsx
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
var DEFAULT_OPTS = {
  title: "Tag Explorer",
  defaultState: "collapsed",
  showCount: true,
  sortBy: "name",
  exclude: []
};
function makeNode(segment, fullTag) {
  return { segment, fullTag, own: 0, total: 0, children: /* @__PURE__ */ new Map() };
}
function buildTagTree(allFiles, exclude) {
  const root = makeNode("", "");
  for (const file of allFiles) {
    const frontmatter = file?.frontmatter;
    const rawTags = frontmatter?.tags;
    if (!Array.isArray(rawTags)) continue;
    const seen = /* @__PURE__ */ new Set();
    for (const raw of rawTags) {
      const tag = String(raw).trim();
      if (!tag || exclude.has(tag)) continue;
      const segments = tag.split("/").filter(Boolean);
      if (segments.length === 0) continue;
      let node = root;
      const acc = [];
      for (const segment of segments) {
        acc.push(segment);
        const fullTag = acc.join("/");
        let child = node.children.get(segment);
        if (!child) {
          child = makeNode(segment, fullTag);
          node.children.set(segment, child);
        }
        if (!seen.has(fullTag)) {
          seen.add(fullTag);
          child.total += 1;
        }
        node = child;
      }
      node.own += 1;
    }
  }
  return root;
}
function sortChildren(node, sortBy) {
  const children = Array.from(node.children.values());
  children.sort((a, b) => {
    if (sortBy === "count" && a.total !== b.total) return b.total - a.total;
    return a.segment.localeCompare(b.segment, void 0, {
      numeric: true,
      sensitivity: "base"
    });
  });
  return children;
}
var TagExplorer = (userOpts) => {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const exclude = new Set(opts.exclude);
  const Component = ({
    allFiles,
    fileData,
    displayClass
  }) => {
    const root = buildTagTree(allFiles ?? [], exclude);
    const topLevel = sortChildren(root, opts.sortBy);
    if (topLevel.length === 0) return null;
    const currentSlug = fileData?.slug;
    const renderNode = (node) => {
      const children = sortChildren(node, opts.sortBy);
      const href = resolveRelative(currentSlug, `tags/${node.fullTag}`);
      const label = /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("a", { href, class: "internal tag-link", children: node.segment }),
        opts.showCount ? /* @__PURE__ */ jsx("span", { class: "tag-count", children: node.total }) : null
      ] });
      if (children.length === 0) {
        return /* @__PURE__ */ jsx("li", { class: "tag-leaf", children: label });
      }
      return /* @__PURE__ */ jsx("li", { class: "tag-branch", children: /* @__PURE__ */ jsxs("details", { open: opts.defaultState === "open", children: [
        /* @__PURE__ */ jsx("summary", { children: label }),
        /* @__PURE__ */ jsx("ul", { children: children.map(renderNode) })
      ] }) });
    };
    return /* @__PURE__ */ jsxs("div", { class: classNames(displayClass, "tag-explorer"), children: [
      /* @__PURE__ */ jsx("h3", { children: opts.title }),
      /* @__PURE__ */ jsx("ul", { class: "tag-explorer-list", children: topLevel.map(renderNode) })
    ] });
  };
  Component.css = tagExplorer_default;
  return Component;
};
var TagExplorer_default = TagExplorer;
export {
  TagExplorer,
  TagExplorer_default as default
};
//# sourceMappingURL=index.js.map
