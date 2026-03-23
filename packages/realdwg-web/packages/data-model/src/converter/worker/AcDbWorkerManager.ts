/**
 * Simple worker framework
 */

export interface AcDbWorkerConfig {
  /** Worker script URL (required if useWorker is true) */
  workerUrl: string | URL
  /** Timeout for worker operations in milliseconds */
  timeout?: number
  /** Maximum number of concurrent workers */
  maxConcurrentWorkers?: number
}

export interface AcDbWorkerResult<TOutput = unknown> {
  success: boolean
  data?: TOutput
  error?: string
  duration: number
}

export interface AcDbWorkerInstance {
  worker: Worker
  isBusy: boolean
  id: string
  createdAt: Date
}

/**
 * Simple worker framework
 */
export class AcDbWorkerManager {
  private config: Required<AcDbWorkerConfig>
  private taskId = 0
  private workers = new Map<string, AcDbWorkerInstance>()
  private pendingTasks = new Map<
    string,
    {
      resolve: (value: AcDbWorkerResult) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()

  constructor(config: AcDbWorkerConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      timeout: config.timeout ?? 30000,
      maxConcurrentWorkers: config.maxConcurrentWorkers ?? 4
    }
  }

  /**
   * Execute a task with worker support and fallback
   */
  async execute<TInput, TOutput>(
    input: TInput,
    workerUrl?: string
  ): Promise<AcDbWorkerResult<TOutput>> {
    const startTime = Date.now()
    const taskId = this.generateTaskId()

    try {
      return await this.executeInWorker(
        taskId,
        input,
        workerUrl || this.config.workerUrl
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      }
    }
  }

  /**
   * Execute task in web worker
   */
  private async executeInWorker<TInput, TOutput>(
    taskId: string,
    input: TInput,
    workerUrl: string | URL
  ): Promise<AcDbWorkerResult<TOutput>> {
    const startTime = Date.now()

    return new Promise<AcDbWorkerResult<TOutput>>((resolve, reject) => {
      // Get or create worker
      const worker = this.getAvailableWorker(workerUrl)

      // Set up timeout
      const timeout = setTimeout(() => {
        this.cleanupTask(taskId)
        this.releaseWorker(worker)
        reject(
          new Error(`Worker operation timed out after ${this.config.timeout}ms`)
        )
      }, this.config.timeout)

      // Store task
      this.pendingTasks.set(taskId, {
        resolve: result => {
          clearTimeout(timeout)
          this.releaseWorker(worker)
          resolve(result as AcDbWorkerResult<TOutput>)
        },
        reject: error => {
          clearTimeout(timeout)
          this.releaseWorker(worker)
          reject(error)
        },
        timeout
      })

      // Set up message handler
      const messageHandler = (event: MessageEvent) => {
        const { id, success, data, error } = event.data
        if (id !== taskId) return

        this.cleanupTask(taskId)

        const duration = Date.now() - startTime
        if (success) {
          resolve({
            success: true,
            data: data as TOutput,
            duration
          })
        } else {
          resolve({
            success: false,
            error,
            duration
          })
        }
      }

      const errorHandler = (error: ErrorEvent) => {
        this.cleanupTask(taskId)
        reject(new Error(`Worker error: ${error.message}`))
      }

      worker.addEventListener('message', messageHandler)
      worker.addEventListener('error', errorHandler)

      // Send task to worker
      worker.postMessage({
        id: taskId,
        input
      })
    })
  }

  /**
   * Clean up a pending task
   */
  private cleanupTask(taskId: string): void {
    const task = this.pendingTasks.get(taskId)
    if (task) {
      clearTimeout(task.timeout)
      this.pendingTasks.delete(taskId)
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${++this.taskId}_${Date.now()}`
  }

  /**
   * Detect if web workers are supported
   */
  detectWorkerSupport(): boolean {
    return typeof Worker !== 'undefined'
  }

  /**
   * Get an available worker or create a new one
   */
  private getAvailableWorker(workerUrl: string | URL): Worker {
    // Find available worker
    for (const [_id, instance] of this.workers) {
      if (!instance.isBusy) {
        instance.isBusy = true
        return instance.worker
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.config.maxConcurrentWorkers) {
      const worker = new Worker(workerUrl, { type: 'module' })
      const id = this.generateWorkerId()
      const instance: AcDbWorkerInstance = {
        worker,
        isBusy: true,
        id,
        createdAt: new Date()
      }
      this.workers.set(id, instance)
      return worker
    }

    // Reuse oldest worker
    const oldestWorker = Array.from(this.workers.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0]

    oldestWorker.isBusy = true
    return oldestWorker.worker
  }

  /**
   * Release a worker back to the pool
   */
  private releaseWorker(worker: Worker): void {
    for (const [_id, instance] of this.workers) {
      if (instance.worker === worker) {
        instance.isBusy = false
        break
      }
    }
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(): string {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get framework statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.size,
      busyWorkers: Array.from(this.workers.values()).filter(w => w.isBusy)
        .length,
      pendingTasks: this.pendingTasks.size,
      config: this.config
    }
  }

  /**
   * Clean up all pending tasks and workers
   */
  destroy(): void {
    // Clear all pending requests
    for (const [_taskId, task] of this.pendingTasks) {
      clearTimeout(task.timeout)
      task.reject(new Error('Framework destroyed'))
    }
    this.pendingTasks.clear()

    // Terminate all workers
    for (const [_id, instance] of this.workers) {
      instance.worker.terminate()
    }
    this.workers.clear()
  }
}

/**
 * Simple API for executing tasks with worker support
 */
export class AcDbWorkerApi {
  private framework: AcDbWorkerManager

  constructor(config: AcDbWorkerConfig) {
    this.framework = new AcDbWorkerManager(config)
  }

  /**
   * Execute a task with optional worker support
   */
  async execute<TInput, TOutput>(
    input: TInput,
    workerUrl?: string
  ): Promise<AcDbWorkerResult<TOutput>> {
    return this.framework.execute(input, workerUrl)
  }

  /**
   * Get framework statistics
   */
  getStats() {
    return this.framework.getStats()
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.framework.destroy()
  }
}

/**
 * Create a worker API instance
 */
export function createWorkerApi(config: AcDbWorkerConfig): AcDbWorkerApi {
  return new AcDbWorkerApi(config)
}
