// local-plugins/footer/src/components/footer.css
var footer_default = "/* Ported from the Quartz v4 quartz/components/styles/footer.scss (de-nested to plain CSS). */\nfooter {\n  text-align: left;\n  margin-bottom: 4rem;\n  opacity: 0.7;\n}\n\nfooter ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: row;\n  gap: 1rem;\n  margin-top: -1rem;\n  flex-wrap: wrap;\n}\n\nfooter li a {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n}\n\nfooter li a i {\n  font-size: 1.1em;\n}\n";

// local-plugins/footer/src/components/Footer.tsx
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
var DEFAULT_OPTS = {
  links: [],
  createdWith: "Created with"
};
var Footer = (userOpts) => {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const Component = ({ displayClass }) => {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const links = Array.isArray(opts.links) ? opts.links : Object.entries(opts.links ?? {}).map(([text, href]) => ({ text, href }));
    const org = opts.organization;
    return /* @__PURE__ */ jsxs("footer", { class: displayClass ?? "", children: [
      opts.createdWith ? /* @__PURE__ */ jsxs("p", { children: [
        opts.createdWith,
        " ",
        /* @__PURE__ */ jsx("a", { href: "https://quartz.jzhao.xyz/", children: "Quartz" }),
        " \xA9 ",
        year
      ] }) : null,
      opts.name ? /* @__PURE__ */ jsxs("p", { children: [
        /* @__PURE__ */ jsx("span", { children: opts.name }),
        opts.role ? /* @__PURE__ */ jsx("span", { children: ` \u2014 ${opts.role}` }) : null,
        org?.name ? /* @__PURE__ */ jsxs("span", { children: [
          " at ",
          org.url ? /* @__PURE__ */ jsx("a", { href: org.url, children: org.name }) : org.name
        ] }) : null
      ] }) : null,
      /* @__PURE__ */ jsx("ul", { children: links.map(({ text, href, icon }) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", { href, children: [
        icon ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("i", { class: icon, "aria-hidden": "true" }),
          " "
        ] }) : null,
        text
      ] }) })) })
    ] });
  };
  Component.css = footer_default;
  return Component;
};
var Footer_default = Footer;
export {
  Footer,
  Footer_default as default
};
//# sourceMappingURL=index.js.map
