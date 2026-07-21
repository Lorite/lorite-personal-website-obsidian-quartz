// local-plugins/collection-table/src/collectionTable.css
var collectionTable_default = '/* Styling for the generated collection-index tables (movies, research, ...). */\n\narticle.collection-index table {\n  width: 100%;\n  font-size: 0.9rem;\n}\n\narticle.collection-index th.sortable {\n  cursor: pointer;\n  user-select: none;\n  white-space: nowrap;\n}\n\narticle.collection-index th.sortable:hover {\n  color: var(--secondary);\n}\n\n/* Sort direction indicator; a neutral marker shows the column is sortable. */\narticle.collection-index th.sortable::after {\n  content: " \u2195";\n  opacity: 0.3;\n  font-size: 0.85em;\n}\n\narticle.collection-index th.sorted-asc::after {\n  content: " \u2191";\n  opacity: 0.9;\n}\n\narticle.collection-index th.sorted-desc::after {\n  content: " \u2193";\n  opacity: 0.9;\n}\n\n/* Keep long titles readable rather than letting one column dominate. */\narticle.collection-index td:first-child {\n  min-width: 12rem;\n}\n\narticle.collection-index td time {\n  white-space: nowrap;\n  opacity: 0.75;\n}\n\n.collection-table-controls {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin: 1rem 0 0.5rem 0;\n}\n\n.collection-filter {\n  flex: 1 1 auto;\n  max-width: 20rem;\n  padding: 0.4rem 0.6rem;\n  font-family: inherit;\n  font-size: 0.9rem;\n  color: var(--dark);\n  background: var(--light);\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n}\n\n.collection-filter:focus {\n  outline: none;\n  border-color: var(--secondary);\n}\n\n.collection-count {\n  font-size: 0.8rem;\n  opacity: 0.6;\n  white-space: nowrap;\n}\n';

// local-plugins/collection-table/src/collectionTable.inline.ts
var collectionTable_inline_default = '"use strict";\n(() => {\n  // local-plugins/collection-table/src/collectionTable.inline.ts\n  var EMPTY = /* @__PURE__ */ Symbol("empty");\n  function cellValue(row, index) {\n    const cell = row.cells[index];\n    if (!cell) return EMPTY;\n    const time = cell.querySelector("time");\n    if (time instanceof HTMLTimeElement && time.dateTime) {\n      const ms = Date.parse(time.dateTime);\n      if (!Number.isNaN(ms)) return ms;\n    }\n    const text = (cell.textContent ?? "").trim();\n    if (!text) return EMPTY;\n    const rating = text.match(/^(\\d+(?:\\.\\d+)?)\\s*\\/\\s*10$/);\n    if (rating) return parseFloat(rating[1]);\n    if (/^-?\\d+(?:\\.\\d+)?$/.test(text)) return parseFloat(text);\n    return text.toLowerCase();\n  }\n  function compare(a, b) {\n    if (typeof a === "number" && typeof b === "number") return a - b;\n    return String(a).localeCompare(String(b), void 0, { numeric: true, sensitivity: "base" });\n  }\n  function compareRows(a, b, index, direction) {\n    const av = cellValue(a, index);\n    const bv = cellValue(b, index);\n    if (av === EMPTY && bv === EMPTY) return 0;\n    if (av === EMPTY) return 1;\n    if (bv === EMPTY) return -1;\n    return compare(av, bv) * direction;\n  }\n  function setupTable(table) {\n    if (table.dataset.collectionEnhanced === "true") return;\n    table.dataset.collectionEnhanced = "true";\n    const tbody = table.tBodies[0];\n    const headRow = table.tHead?.rows[0];\n    if (!tbody || !headRow) return;\n    const rows = Array.from(tbody.rows);\n    const controls = document.createElement("div");\n    controls.className = "collection-table-controls";\n    const filter = document.createElement("input");\n    filter.type = "search";\n    filter.className = "collection-filter";\n    filter.placeholder = "Filter\\u2026";\n    filter.setAttribute("aria-label", "Filter this collection");\n    const count = document.createElement("span");\n    count.className = "collection-count";\n    controls.append(filter, count);\n    table.parentElement?.insertBefore(controls, table);\n    const updateCount = (visible) => {\n      count.textContent = visible === rows.length ? `${rows.length}` : `${visible} / ${rows.length}`;\n    };\n    updateCount(rows.length);\n    filter.addEventListener("input", () => {\n      const query = filter.value.trim().toLowerCase();\n      let visible = 0;\n      for (const row of rows) {\n        const match = !query || (row.textContent ?? "").toLowerCase().includes(query);\n        row.style.display = match ? "" : "none";\n        if (match) visible++;\n      }\n      updateCount(visible);\n    });\n    const headers = Array.from(headRow.cells);\n    headers.forEach((th, index) => {\n      th.classList.add("sortable");\n      th.tabIndex = 0;\n      th.setAttribute("role", "button");\n      const sort = () => {\n        const ascending = th.dataset.sortDir !== "asc";\n        for (const other of headers) {\n          delete other.dataset.sortDir;\n          other.classList.remove("sorted-asc", "sorted-desc");\n        }\n        th.dataset.sortDir = ascending ? "asc" : "desc";\n        th.classList.add(ascending ? "sorted-asc" : "sorted-desc");\n        const direction = ascending ? 1 : -1;\n        const sorted = rows.slice().sort((a, b) => compareRows(a, b, index, direction));\n        for (const row of sorted) tbody.appendChild(row);\n      };\n      th.addEventListener("click", sort);\n      th.addEventListener("keydown", (event) => {\n        if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) {\n          event.preventDefault();\n          sort();\n        }\n      });\n    });\n  }\n  function enhanceAll() {\n    document.querySelectorAll("article.collection-index table").forEach(setupTable);\n  }\n  enhanceAll();\n  document.addEventListener("nav", enhanceAll);\n})();\n';

// local-plugins/collection-table/src/index.ts
var CollectionTable = () => ({
  name: "CollectionTable",
  // Quartz validates a transformer instance by looking for at least one of textTransform /
  // markdownPlugins / htmlPlugins, so expose a no-op even though this plugin only adds CSS + JS.
  htmlPlugins() {
    return [];
  },
  externalResources() {
    return {
      css: [{ content: collectionTable_default, inline: true, spaPreserve: true }],
      js: [
        {
          loadTime: "afterDOMReady",
          contentType: "inline",
          spaPreserve: true,
          script: collectionTable_inline_default
        }
      ]
    };
  }
});
var index_default = CollectionTable;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
