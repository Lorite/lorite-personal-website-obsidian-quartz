import type { QuartzComponent } from "@quartz-community/types"

export interface FooterLink {
  text: string
  href: string
  /** Icon class, e.g. a Font Awesome class like "fa-brands fa-github". */
  icon?: string
}

export interface FooterOptions {
  /** Either a { label: href } map or a list of links (the list form supports icons). */
  links: Record<string, string> | FooterLink[]
  name?: string
  role?: string
  organization?: { name: string; url?: string }
  /** Leading credit text; set to "" to hide the Quartz credit line entirely. */
  createdWith: string
}

export declare const Footer: (userOpts?: Partial<FooterOptions>) => QuartzComponent

export default Footer
