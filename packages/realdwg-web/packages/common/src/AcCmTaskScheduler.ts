/**
 * @fileoverview Task scheduling and execution system for the AutoCAD Common library.
 *
 * This module provides a type-safe task scheduler that can execute a chain of named tasks
 * in sequence, with progress reporting, error handling, and data flow between tasks.
 *
 * @module AcCmTaskScheduler
 * @version 1.0.0
 */

/**
 * Represents an error that occurred during task execution in the scheduler.
 *
 * This interface provides detailed information about task failures, including
 * the original error, the position of the failed task in the execution queue,
 * and a reference to the task that caused the failure.
 *
 * @example
 * ```typescript
 * const errorHandler = (taskError: AcCmTaskError) => {
 *   console.error(`Task "${taskError.task.name}" failed at position ${taskError.taskIndex}:`, taskError.error)
 * }
 * ```
 */
export interface AcCmTaskError {
  /**
   * The error that was thrown during task execution.
   *
   * This can be any type of error (Error, string, object, etc.) that was
   * thrown by the task's run() method or during task execution.
   */
  error: unknown

  /**
   * The zero-based index of the failed task in the task execution queue.
   *
   * This indicates the position of the failed task relative to the start
   * of the task chain, useful for debugging and error reporting.
   */
  taskIndex: number

  /**
   * The task instance that failed during execution.
   *
   * Provides access to the task's name and other properties for
   * detailed error reporting and debugging.
   */
  task: AcCmTask<unknown, unknown>
}

/**
 * Represents a named unit of work with an asynchronous or synchronous execution function.
 *
 * Tasks can be chained together in a scheduler to create complex workflows with
 * proper data flow and error handling.
 *
 * @template TIn - Input type for the task.
 * @template TOut - Output type for the task.
 *
 * @example
 * ```typescript
 * class LoadFileTask extends AcCmTask<string, ArrayBuffer> {
 *   constructor() {
 *     super('LoadFile')
 *   }
 *
 *   async run(url: string): Promise<ArrayBuffer> {
 *     const response = await fetch(url)
 *     return response.arrayBuffer()
 *   }
 * }
 * ```
 */
export class AcCmTask<TIn, TOut> {
  /**
   * Name of the task (for logging/debugging purposes)
   */
  readonly name: string

  /**
   * Creates a new task with the specified name.
   *
   * @param {string} name - The name identifier for this task.
   */
  constructor(name: string) {
    this.name = name
  }

  /**
   * Executes the task with the given input.
   *
   * This method must be implemented by subclasses to define the actual work
   * performed by the task. Can return either a synchronous result or a Promise.
   *
   * @param {TIn} _input - The input data for the task.
   * @returns {TOut | Promise<TOut>} The task result, either synchronous or asynchronous.
   * @throws {Error} When the method is not implemented by a subclass.
   */
  run(_input: TIn): TOut | Promise<TOut> {
    throw new Error('run() must be implemented by subclass')
  }
}

/**
 * Callback function that reports progress after a task completes.
 *
 * @param {number} progress - A number between 0 and 1 indicating task completion.
 * @param {AcCmTask<unknown, unknown>} task - The task that was just completed.
 */
type AcCmProgressCallback = (
  progress: number,
  task: AcCmTask<unknown, unknown>
) => void

/**
 * Callback function to handle the final output after all tasks complete successfully.
 *
 * @template T - The type of the final result.
 * @param {T} finalResult - The final result from the task chain.
 */
export type AcCmCompleteCallback<T> = (finalResult: T) => void

/**
 * Callback function that handles errors during task execution.
 *
 * Returning `true` will interrupt the entire workflow.
 * Returning `false` will allow the scheduler to continue executing remaining tasks.
 *
 * @param {AcCmTaskError} error - Detailed information about the task error.
 * @returns {boolean} Whether to interrupt the task execution flow.
 */
type AcCmErrorCallback = (error: AcCmTaskError) => boolean

/**
 * Type-safe task scheduler that executes a chain of named tasks in order.
 *
 * The scheduler passes results between tasks, reports progress, and stops
 * execution on the first failure. Supports both synchronous and asynchronous tasks.
 *
 * @template TInitial - Initial input type for the first task.
 * @template TFinal - Final output type from the last task.
 *
 * @example
 * ```typescript
 * // Create scheduler with string input and object output
 * const scheduler = new AcCmTaskScheduler<string, ParsedData>()
 *
 * // Add tasks
 * scheduler.addTask(new LoadFileTask())
 * scheduler.addTask(new ParseDataTask())
 * scheduler.addTask(new ValidateDataTask())
 *
 * // Set callbacks
 * scheduler.setProgressCallback((progress, task) => {
 *   console.log(`${task.name}: ${(progress * 100).toFixed(1)}%`)
 * })
 *
 * scheduler.setCompleteCallback((result) => {
 *   console.log('All tasks completed:', result)
 * })
 *
 * // Execute
 * await scheduler.execute('file.dwg')
 * ```
 */
export class AcCmTaskScheduler<TInitial, TFinal = TInitial> {
  private tasks: AcCmTask<unknown, unknown>[] = []
  private onProgress: AcCmProgressCallback = () => {}
  private onComplete: AcCmCompleteCallback<TFinal> = () => {}
  private onError: AcCmErrorCallback = () => false

  /**
   * Schedules a task to be executed asynchronously.
   *
   * This method uses requestAnimationFrame in browser environments or setTimeout
   * in Node.js environments to schedule the task.
   *
   * @param callback - The callback function to schedule
   * @returns Promise that resolves with the result of the callback
   */
  private scheduleTask<T>(callback: () => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const executeCallback = () => {
        // Execute the callback and handle the result
        Promise.resolve(callback()).then(resolve).catch(reject)
      }

      if (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        // Browser environment with requestAnimationFrame
        window.requestAnimationFrame(executeCallback)
      } else {
        // Node.js or fallback to setTimeout
        setTimeout(executeCallback, 0)
      }
    })
  }

  /**
   * Adds a task to the execution queue.
   *
   * @param task Task instance with name and run function
   */
  addTask<TIn, TOut>(task: AcCmTask<TIn, TOut>): void {
    this.tasks.push(task as AcCmTask<unknown, unknown>)
  }

  /**
   * Sets a callback to receive progress updates.
   */
  setProgressCallback(callback: AcCmProgressCallback): void {
    this.onProgress = callback
  }

  /**
   * Sets a callback to be called after successful completion of all tasks.
   */
  setCompleteCallback(callback: AcCmCompleteCallback<TFinal>): void {
    this.onComplete = callback
  }

  /**
   * Sets a callback to be called if any task throws an error.
   */
  setErrorCallback(callback: AcCmErrorCallback): void {
    this.onError = callback
  }

  /**
   * Starts execution of the task queue with the given initial input.
   */
  async run(initialData: TInitial): Promise<void> {
    const total = this.tasks.length
    let result: unknown = initialData

    for (let i = 0; i < total; i++) {
      const task = this.tasks[i]

      try {
        result = await this.scheduleTask(async () => {
          const output = await task.run(result)
          this.onProgress((i + 1) / total, task)
          return output
        })
      } catch (error) {
        const shouldInterrupt = this.onError({ error, taskIndex: i, task })
        if (shouldInterrupt) {
          // Stop executing further tasks
          return Promise.reject(error)
        }
      }
    }

    this.onComplete(result as TFinal)
  }
}
