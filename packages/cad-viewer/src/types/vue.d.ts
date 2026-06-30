declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<Record<string, any>, any, any>
  export default component
}

declare module '@mlightcad/cad-agent-plugin/style.css' {
  const css: string
  export default css
}
