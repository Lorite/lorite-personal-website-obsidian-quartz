// local-plugins/icon-fonts/src/index.ts
var DEFAULT_STYLESHEET = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css";
var IconFonts = (opts) => {
  const stylesheet = opts?.stylesheet ?? DEFAULT_STYLESHEET;
  return {
    name: "IconFonts",
    // Quartz validates a transformer instance by looking for at least one of textTransform /
    // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS.
    htmlPlugins() {
      return [];
    },
    externalResources() {
      if (!stylesheet) return {};
      return {
        css: [{ content: stylesheet, inline: false, spaPreserve: true }]
      };
    }
  };
};
var index_default = IconFonts;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
