// react-markdown, remark-gfm, remark-parse and unified are ESM only, and
// twake-mui imports them for a Markdown component the calendar does not render
export default function markdownStub(): null {
  return null
}

// twake-mui builds a unified processor when it loads
interface ProcessorStub {
  use: () => ProcessorStub
  parse: () => { type: 'root'; children: [] }
  runSync: <T>(tree: T) => T
}

export const unified = (): ProcessorStub => {
  const processor: ProcessorStub = {
    use: () => processor,
    parse: () => ({ type: 'root', children: [] }),
    runSync: tree => tree
  }
  return processor
}
