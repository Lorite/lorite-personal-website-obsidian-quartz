import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

function TopMenu({ displayClass, fileData }: QuartzComponentProps) {
  const tags: string[] = (fileData?.frontmatter?.tags ?? []).map((t: unknown) =>
    String(t).toLowerCase(),
  )
  const hasPersonal = tags.includes("personal")
  const hasWork = tags.includes("work")

  return (
    <nav class={classNames(displayClass, "top-menu")} aria-label="Top Menu">
      {hasPersonal ? (
        <a href="/tags/personal" class="internal tag-link">
          personal
        </a>
      ) : (
        <a href="/tags/personal">#personal</a>
      )}
      <span aria-hidden="true" style="margin: 0 0.5rem;">
        |
      </span>
      {hasWork ? (
        <a href="/tags/work" class="internal tag-link">
          work
        </a>
      ) : (
        <a href="/tags/work">#work</a>
      )}
    </nav>
  )
}

export default (() => TopMenu) satisfies QuartzComponentConstructor
