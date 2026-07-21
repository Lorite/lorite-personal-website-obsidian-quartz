// local-plugins/topmenu/src/components/TopMenu.tsx
import { classNames } from "@quartz-community/utils";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
var DEFAULT_OPTS = {
  links: [
    { tag: "personal", href: "/tags/personal" },
    { tag: "work", href: "/tags/work" }
  ],
  separator: "|"
};
var TopMenu = (userOpts) => {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const Component = ({ displayClass, fileData }) => {
    const rawTags = fileData?.frontmatter?.tags ?? [];
    const tags = (Array.isArray(rawTags) ? rawTags : []).map((t) => String(t).toLowerCase());
    return /* @__PURE__ */ jsx("nav", { class: classNames(displayClass, "top-menu"), "aria-label": "Top Menu", children: opts.links.map((link, i) => {
      const label = link.text ?? link.tag;
      const isActive = tags.includes(link.tag.toLowerCase());
      return /* @__PURE__ */ jsxs(Fragment, { children: [
        i > 0 ? /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: "margin: 0 0.5rem;", children: opts.separator }) : null,
        isActive ? /* @__PURE__ */ jsx("a", { href: link.href, class: "internal tag-link", children: label }) : /* @__PURE__ */ jsx("a", { href: link.href, children: `#${label}` })
      ] });
    }) });
  };
  return Component;
};
var TopMenu_default = TopMenu;
export {
  TopMenu,
  TopMenu_default as default
};
//# sourceMappingURL=index.js.map
