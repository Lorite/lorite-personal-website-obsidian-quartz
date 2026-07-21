import type { QuartzComponent, QuartzComponentProps } from "@quartz-community/types"
import { classNames } from "@quartz-community/utils"

export interface TopMenuLink {
  /** Frontmatter tag this link represents (compared lower-cased). */
  tag: string
  /** Where the link points. */
  href: string
  /** Optional label; defaults to the tag name. */
  text?: string
}

export interface TopMenuOptions {
  links: TopMenuLink[]
  separator: string
}

const DEFAULT_OPTS: TopMenuOptions = {
  links: [
    { tag: "personal", href: "/tags/personal" },
    { tag: "work", href: "/tags/work" },
  ],
  separator: "|",
}

/**
 * Ported from the Quartz v4 `quartz/components/TopMenu.tsx`.
 *
 * Renders one link per configured tag. A tag present in the current page's frontmatter renders as an
 * active `internal tag-link`; otherwise it renders as a plain `#tag` link, so the menu doubles as an
 * indicator of which section the current note belongs to.
 */
export const TopMenu = (userOpts?: Partial<TopMenuOptions>): QuartzComponent => {
  const opts: TopMenuOptions = { ...DEFAULT_OPTS, ...userOpts }

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const rawTags = (fileData?.frontmatter?.tags ?? []) as unknown[]
    const tags = (Array.isArray(rawTags) ? rawTags : []).map((t) => String(t).toLowerCase())

    return (
      <nav class={classNames(displayClass, "top-menu")} aria-label="Top Menu">
        {opts.links.map((link, i) => {
          const label = link.text ?? link.tag
          const isActive = tags.includes(link.tag.toLowerCase())
          return (
            <>
              {i > 0 ? (
                <span aria-hidden="true" style="margin: 0 0.5rem;">
                  {opts.separator}
                </span>
              ) : null}
              {isActive ? (
                <a href={link.href} class="internal tag-link">
                  {label}
                </a>
              ) : (
                <a href={link.href}>{`#${label}`}</a>
              )}
            </>
          )
        })}
      </nav>
    )
  }

  return Component
}

export default TopMenu
