import React from 'react'

// Stands for an SVG imported as a React component (`*.svg?react`)
export default function SvgComponentStub(
  props: React.SVGProps<SVGSVGElement>
): React.ReactElement {
  return <svg {...props} />
}
