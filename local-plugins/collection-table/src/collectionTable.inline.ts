/**
 * Turns the generated collection-index tables into sortable, filterable ones.
 *
 * Scoped to `article.collection-index` — publish-sync writes `cssclasses: [collection-index]` into
 * the frontmatter of every generated index note, and Quartz puts those classes on the <article>.
 */

type CellValue = string | number

/** Empty cells always sort last, whichever direction is active. */
const EMPTY = Symbol("empty")

function cellValue(row: HTMLTableRowElement, index: number): CellValue | typeof EMPTY {
  const cell = row.cells[index]
  if (!cell) return EMPTY

  // Dates carry an exact machine-readable value.
  const time = cell.querySelector("time")
  if (time instanceof HTMLTimeElement && time.dateTime) {
    const ms = Date.parse(time.dateTime)
    if (!Number.isNaN(ms)) return ms
  }

  const text = (cell.textContent ?? "").trim()
  if (!text) return EMPTY

  // Ratings render as "8/10".
  const rating = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*10$/)
  if (rating) return parseFloat(rating[1])

  if (/^-?\d+(?:\.\d+)?$/.test(text)) return parseFloat(text)

  return text.toLowerCase()
}

function compare(a: CellValue, b: CellValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

/**
 * Compare two rows for a column. Empty cells always sort to the bottom, in BOTH directions — so the
 * direction multiplier is applied only to the value comparison, never to the empty-handling (doing
 * otherwise floats every unrated item to the top when sorting descending).
 */
function compareRows(
  a: HTMLTableRowElement,
  b: HTMLTableRowElement,
  index: number,
  direction: number,
): number {
  const av = cellValue(a, index)
  const bv = cellValue(b, index)
  if (av === EMPTY && bv === EMPTY) return 0
  if (av === EMPTY) return 1
  if (bv === EMPTY) return -1
  return compare(av, bv) * direction
}

function setupTable(table: HTMLTableElement) {
  if (table.dataset.collectionEnhanced === "true") return
  table.dataset.collectionEnhanced = "true"

  const tbody = table.tBodies[0]
  const headRow = table.tHead?.rows[0]
  if (!tbody || !headRow) return

  const rows = Array.from(tbody.rows)

  const controls = document.createElement("div")
  controls.className = "collection-table-controls"

  const filter = document.createElement("input")
  filter.type = "search"
  filter.className = "collection-filter"
  filter.placeholder = "Filter…"
  filter.setAttribute("aria-label", "Filter this collection")

  const count = document.createElement("span")
  count.className = "collection-count"

  controls.append(filter, count)
  table.parentElement?.insertBefore(controls, table)

  const updateCount = (visible: number) => {
    count.textContent = visible === rows.length ? `${rows.length}` : `${visible} / ${rows.length}`
  }
  updateCount(rows.length)

  filter.addEventListener("input", () => {
    const query = filter.value.trim().toLowerCase()
    let visible = 0
    for (const row of rows) {
      const match = !query || (row.textContent ?? "").toLowerCase().includes(query)
      row.style.display = match ? "" : "none"
      if (match) visible++
    }
    updateCount(visible)
  })

  const headers = Array.from(headRow.cells)
  headers.forEach((th, index) => {
    th.classList.add("sortable")
    th.tabIndex = 0
    th.setAttribute("role", "button")

    const sort = () => {
      const ascending = th.dataset.sortDir !== "asc"
      for (const other of headers) {
        delete other.dataset.sortDir
        other.classList.remove("sorted-asc", "sorted-desc")
      }
      th.dataset.sortDir = ascending ? "asc" : "desc"
      th.classList.add(ascending ? "sorted-asc" : "sorted-desc")

      const direction = ascending ? 1 : -1
      const sorted = rows.slice().sort((a, b) => compareRows(a, b, index, direction))
      // Re-appending an existing node moves it, so this reorders in place.
      for (const row of sorted) tbody.appendChild(row)
    }

    th.addEventListener("click", sort)
    th.addEventListener("keydown", (event) => {
      if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        sort()
      }
    })
  })
}

function enhanceAll() {
  document.querySelectorAll<HTMLTableElement>("article.collection-index table").forEach(setupTable)
}

enhanceAll()
// Quartz's SPA router swaps the article without a full page load.
document.addEventListener("nav", enhanceAll)
