import { log } from '@mlightcad/data-model'
/**
 * A utility class that waits until a specified condition is met
 * or a timeout occurs, and then executes a single action.
 *
 * @example
 * ```ts
 * const waiter = new AcEdConditionWaiter(
 *   () => isDataReady(),     // condition
 *   () => log.info('Ready or timed out'), // action
 *   1000,                    // check every 1s
 *   10000                    // timeout after 10s
 * );
 *
 * waiter.start();
 * ```
 */
export class AcEdConditionWaiter {
  private timerId: number | null = null
  private timeoutId: number | null = null

  /**
   * Creates a new AcEdConditionWaiter.
   *
   * @param condition - The condition function to check periodically.
   * @param action - The action to execute once when the condition is met or timeout occurs.
   * @param checkInterval - How often (ms) to check the condition. Default: 1000 ms.
   * @param timeout - Maximum time (ms) to wait before executing the action. Default: 0 (no timeout).
   */
  constructor(
    private readonly condition: () => boolean,
    private readonly action: () => void,
    private readonly checkInterval: number = 1000,
    private readonly timeout: number = 0
  ) {}

  /**
   * Starts checking the condition at the defined interval.
   * Executes the action once when the condition becomes true or when timeout is reached.
   */
  public start(): void {
    if (this.timerId !== null) return // already running

    // Periodically check condition
    this.timerId = window.setInterval(() => {
      if (this.condition()) {
        this.executeAndStop()
      }
    }, this.checkInterval)

    // Setup timeout if provided
    if (this.timeout > 0) {
      this.timeoutId = window.setTimeout(() => {
        log.warn('AcEdConditionWaiter: Timeout reached.')
        this.executeAndStop()
      }, this.timeout)
    }
  }

  /**
   * Stops all checking without triggering the action.
   */
  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Internal helper to execute the action and stop all timers.
   */
  private executeAndStop(): void {
    this.stop()
    this.action()
  }

  /**
   * Checks whether the waiter is currently active.
   */
  public isRunning(): boolean {
    return this.timerId !== null
  }
}
