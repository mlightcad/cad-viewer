// svg.d.ts
declare module '*.svg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any
  export default content
}

declare module '*.svg?raw' {
  const content: string
  export default content
}
