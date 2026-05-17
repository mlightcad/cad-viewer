/**
 * Yields to the browser so pending paints and animations can run.
 */
export function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}
