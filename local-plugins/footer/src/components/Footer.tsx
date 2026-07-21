import type { QuartzComponent, QuartzComponentProps } from "@quartz-community/types"
import styles from "./footer.css"

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

const DEFAULT_OPTS: FooterOptions = {
  links: [],
  createdWith: "Created with",
}

/**
 * Ported from the Quartz v4 `quartz/components/Footer.tsx`.
 *
 * Differences from v4: the Quartz version number is no longer read from package.json (in v5 the core
 * version isn't exposed to plugins), and the i18n helper isn't available to community plugins, so the
 * credit text is a plain configurable string.
 */
export const Footer = (userOpts?: Partial<FooterOptions>): QuartzComponent => {
  const opts: FooterOptions = { ...DEFAULT_OPTS, ...userOpts }

  const Component: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links: FooterLink[] = Array.isArray(opts.links)
      ? opts.links
      : Object.entries(opts.links ?? {}).map(([text, href]) => ({ text, href }))
    const org = opts.organization

    return (
      <footer class={displayClass ?? ""}>
        {opts.createdWith ? (
          <p>
            {opts.createdWith} <a href="https://quartz.jzhao.xyz/">Quartz</a> © {year}
          </p>
        ) : null}
        {opts.name ? (
          <p>
            <span>{opts.name}</span>
            {opts.role ? <span>{` — ${opts.role}`}</span> : null}
            {org?.name ? (
              <span>
                {" at "}
                {org.url ? <a href={org.url}>{org.name}</a> : org.name}
              </span>
            ) : null}
          </p>
        ) : null}
        <ul>
          {links.map(({ text, href, icon }) => (
            <li>
              <a href={href}>
                {icon ? (
                  <>
                    <i class={icon} aria-hidden="true"></i>{" "}
                  </>
                ) : null}
                {text}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    )
  }

  Component.css = styles
  return Component
}

export default Footer
