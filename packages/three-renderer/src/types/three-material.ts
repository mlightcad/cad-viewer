/**
 * three.js 0.186 still assigns a numeric `Material#id` at runtime, but
 * `@types/three` 0.186 omitted it from the class. Downstream code keys
 * batches and style caches by that id.
 */
export {}

declare module 'three' {
  interface Material {
    readonly id: number
  }
}
