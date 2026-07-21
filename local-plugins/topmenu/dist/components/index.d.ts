import type { QuartzComponent } from "@quartz-community/types"

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

export declare const TopMenu: (userOpts?: Partial<TopMenuOptions>) => QuartzComponent

export default TopMenu
