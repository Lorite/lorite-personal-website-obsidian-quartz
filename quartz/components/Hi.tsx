import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

function Hi({ displayClass }: QuartzComponentProps) {
  return <span class={displayClass}>Hi</span>
}

export default (() => Hi) satisfies QuartzComponentConstructor
