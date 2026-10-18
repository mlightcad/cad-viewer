declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  /** Default export of a single-file Vue component. */
  const component: DefineComponent<object, object, unknown>
  export default component
}
