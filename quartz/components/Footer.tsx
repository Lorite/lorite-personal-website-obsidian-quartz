import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"

type FooterLink = { text: string; href: string; icon?: string }

interface Options {
  links?: Record<string, string> | FooterLink[]
  name?: string
  role?: string
  organization?: { name: string; url?: string }
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links: FooterLink[] = Array.isArray(opts?.links)
      ? opts.links
      : Object.entries(opts?.links ?? {}).map(([text, href]) => ({ text, href }))
    const name = opts?.name
    const role = opts?.role
    const org = opts?.organization
    return (
      <footer class={`${displayClass ?? ""}`}>
        <p>
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
        </p>
        {name ? (
          <p>
            <span>{name}</span>
            {role ? <span>{` — ${role}`}</span> : null}
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

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
