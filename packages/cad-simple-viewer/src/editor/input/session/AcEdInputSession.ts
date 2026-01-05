export abstract class AcEdInputSession<T> {
  protected resolve!: (value: T) => void

  start(): Promise<T> {
    return new Promise<T>(resolve => {
      this.resolve = resolve
      this.onStart()
    })
  }

  /** Called once session starts */
  protected abstract onStart(): void

  /** Handle Enter key. Return true if consumed */
  abstract handleEnter(value: string): boolean

  /** Handle Escape key */
  abstract handleEscape(): void

  /** Cleanup UI / state */
  protected abstract cleanup(): void

  protected finish(value: T) {
    this.cleanup()
    this.resolve(value)
  }
}
