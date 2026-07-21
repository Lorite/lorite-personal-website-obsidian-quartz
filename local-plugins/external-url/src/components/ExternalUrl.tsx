import type { QuartzComponent, QuartzComponentProps } from "@quartz-community/types"
import { classNames } from "@quartz-community/utils"
import styles from "./externalUrl.css"

export interface ExternalUrlOptions {
  /** Frontmatter field holding the source link. */
  field: string
  /** Link text. */
  label: string
}

const DEFAULT_OPTS: ExternalUrlOptions = {
  field: "url",
  label: "External URL",
}

/**
 * Renders a link to a note's source when its frontmatter carries one (e.g. the DOI/IMDb/arXiv URL on
 * a media or literature note).
 *
 * Ported from the v4 fork of ContentMeta (commit 96b0d6d), which appended an "External URL" segment
 * to the content-meta line. The v5 community content-meta plugin has no equivalent and isn't
 * extensible, so this is a separate small component sitting directly beneath it.
 */
export const ExternalUrl = (userOpts?: Partial<ExternalUrlOptions>): QuartzComponent => {
  const opts: ExternalUrlOptions = { ...DEFAULT_OPTS, ...userOpts }

  const Component: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const value = fileData?.frontmatter?.[opts.field]
    if (typeof value !== "string" || value.trim() === "") return null

    return (
      <p class={classNames(displayClass, "external-url")}>
        <a href={value} target="_blank" rel="noopener noreferrer">
          {opts.label}
        </a>
      </p>
    )
  }

  Component.css = styles
  return Component
}

export default ExternalUrl
