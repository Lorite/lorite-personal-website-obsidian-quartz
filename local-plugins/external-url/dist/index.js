// local-plugins/external-url/src/components/ExternalUrl.tsx
import { classNames } from "@quartz-community/utils";

// local-plugins/external-url/src/components/externalUrl.css
var externalUrl_default = "/* Sits directly under the content-meta line, styled to read as part of it. */\n.external-url {\n  margin: 0 0 1rem 0;\n  font-size: 0.9rem;\n  opacity: 0.75;\n}\n";

// local-plugins/external-url/src/components/ExternalUrl.tsx
import { jsx } from "preact/jsx-runtime";
var DEFAULT_OPTS = {
  field: "url",
  label: "External URL"
};
var ExternalUrl = (userOpts) => {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const Component = ({ fileData, displayClass }) => {
    const value = fileData?.frontmatter?.[opts.field];
    if (typeof value !== "string" || value.trim() === "") return null;
    return /* @__PURE__ */ jsx("p", { class: classNames(displayClass, "external-url"), children: /* @__PURE__ */ jsx("a", { href: value, target: "_blank", rel: "noopener noreferrer", children: opts.label }) });
  };
  Component.css = externalUrl_default;
  return Component;
};
var ExternalUrl_default = ExternalUrl;
export {
  ExternalUrl,
  ExternalUrl_default as default
};
//# sourceMappingURL=index.js.map
