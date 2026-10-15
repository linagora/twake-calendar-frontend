declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.svg?react' {
  const ReactComponent: import('react').FC<
    import('react').SVGProps<SVGSVGElement>
  >
  export default ReactComponent
}
