// Callback function to execute business logic of chunk processing.
type AcDbChunkProcessingCallback = (start: number, end: number) => Promise<void>

// Callback function to execute when all of chunks are processed
type AcDbChunkProcessingCompleteCallback = () => void | Promise<void>

/**
 * Class used to break up work into smaller chunks that are executed asynchronously.
 *
 * This is often referred to as "batch processing" or "cooperative multitasking," where the
 * time-consuming task is broken into smaller pieces and executed in small intervals to allow
 * the UI to remain responsive.
 *
 * @example
 * ```typescript
 * const batchProcessor = new AcDbBatchProcessing(1000, 10, 50);
 * await batchProcessor.processChunk(async (start, end) => {
 *   // Process items from start to end
 *   for (let i = start; i < end; i++) {
 *     // Process item i
 *   }
 * });
 * ```
 */
export class AcDbBatchProcessing {
  /** Total number of items to process */
  private _count: number
  /** Number of chunks to process */
  private _numerOfChunk: number
  /** Number of items in one chunk */
  private _chunkSize: number = -1
  /** Minimum number of items in one chunk */
  private _minimumChunkSize: number = 50

  /**
   * Creates a new AcDbBatchProcessing instance.
   *
   * @param count - The total number of items to process
   * @param numerOfChunk - The number of chunks to process
   * @param minimumChunkSize - The minimum number of items in one chunk. If it is greater
   * than the total number of items to process, the total number is used.
   *
   * @example
   * ```typescript
   * const batchProcessor = new AcDbBatchProcessing(1000, 10, 50);
   * ```
   */
  constructor(count: number, numerOfChunk: number, minimumChunkSize: number) {
    this._count = count
    this._numerOfChunk = numerOfChunk < 1 ? 1 : numerOfChunk
    this._minimumChunkSize = minimumChunkSize
    this.calculateChunkSize()
  }

  /**
   * Gets the total number of items to process.
   *
   * @returns The total number of items to process
   *
   * @example
   * ```typescript
   * const totalItems = batchProcessor.count;
   * ```
   */
  get count() {
    return this._count
  }

  /**
   * Gets the number of chunks to process.
   *
   * @returns The number of chunks to process
   *
   * @example
   * ```typescript
   * const numberOfChunks = batchProcessor.numerOfChunk;
   * ```
   */
  get numerOfChunk() {
    return this._numerOfChunk
  }

  /**
   * Gets the minimum number of items in one chunk.
   *
   * @returns The minimum number of items in one chunk
   *
   * @example
   * ```typescript
   * const minChunkSize = batchProcessor.minimumChunkSize;
   * ```
   */
  get minimumChunkSize() {
    return this._minimumChunkSize
  }

  /**
   * Sets the minimum number of items in one chunk.
   *
   * @param value - The new minimum chunk size
   *
   * @example
   * ```typescript
   * batchProcessor.minimumChunkSize = 100;
   * ```
   */
  set minimumChunkSize(value: number) {
    this._minimumChunkSize = value
    this.calculateChunkSize()
  }

  /**
   * Gets the number of items in one chunk.
   *
   * @returns The number of items in one chunk
   *
   * @example
   * ```typescript
   * const chunkSize = batchProcessor.chunkSize;
   * ```
   */
  get chunkSize() {
    return this._chunkSize
  }

  /**
   * Calculates the chunk size based on the total count, number of chunks, and minimum chunk size.
   *
   * @example
   * ```typescript
   * batchProcessor.calculateChunkSize();
   * ```
   */
  private calculateChunkSize() {
    let demicalChunkSize = this._count / this._numerOfChunk
    if (demicalChunkSize < this._minimumChunkSize) {
      demicalChunkSize = Math.min(this._minimumChunkSize, this._count)
    }
    this._chunkSize =
      demicalChunkSize < 1 ? this._count : Math.floor(demicalChunkSize)
  }

  /**
   * Schedules a task to be executed asynchronously.
   *
   * This method uses requestAnimationFrame in browser environments or setTimeout
   * in Node.js environments to schedule the task.
   *
   * @param callback - The callback function to schedule
   * @returns Promise that resolves when the task completes
   *
   * @example
   * ```typescript
   * await batchProcessor.scheduleTask(async () => {
   *   // Task to be executed asynchronously
   * });
   * ```
   */
  private scheduleTask(callback: () => void | Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
   * Processes items in chunks using the provided callback function.
   *
   * This method breaks up the work into chunks and processes each chunk
   * asynchronously, allowing the UI to remain responsive.
   *
   * @param callback - The callback function to execute for each chunk
   * @returns Promise that resolves when all chunks have been processed
   *
   * @example
   * ```typescript
   * await batchProcessor.processChunk(async (start, end) => {
   *   for (let i = start; i < end; i++) {
   *     // Process item i
   *     await processItem(i);
   *   }
   * });
   * ```
   */
  public async processChunk(
    callback: AcDbChunkProcessingCallback,
    onComplete?: AcDbChunkProcessingCompleteCallback
  ) {
    if (this._count <= 0) {
      await onComplete?.()
      return
    }

    let currentIndex = 0

    const processNextChunk = async (): Promise<void> => {
      const start = currentIndex
      const end = Math.min(currentIndex + this._chunkSize, this._count)

      // Call the provided callback with the chunk's range
      await callback(start, end)

      currentIndex = end

      // If there are more items to process, schedule the next chunk
      if (currentIndex < this._count) {
        await this.scheduleTask(processNextChunk) // Schedule the next chunk to be processed asynchronously
      }
    }

    // Start processing the first chunk and wait for all chunks to complete
    await processNextChunk()

    // Explicit completion notification
    await onComplete?.()
  }
}
