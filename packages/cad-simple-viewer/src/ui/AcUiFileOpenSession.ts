import type { AcApDataSource } from '../app/dataSource/AcApDataSource'
import type { AcApDataSourceManager } from '../app/dataSource/AcApDataSourceManager'
import type { AcEdUiTheme } from '../editor/global/AcEdUiTheme'
import {
  AcUiFileOpenLanding,
  type AcUiFileOpenLandingOptions,
  type AcUiFileOpenRequest
} from './AcUiFileOpenLanding'

/**
 * Minimal DocManager surface needed by {@link AcUiFileOpenSession}.
 *
 * Hosts typically return `AcApDocManager.instance` after a dynamic import of
 * `@mlightcad/cad-simple-viewer`. Keeping this structural avoids pulling the
 * viewer into the `/file-open-panel` entry graph.
 */
export interface AcUiFileOpenDocManager {
  readonly dataSourceManager: AcApDataSourceManager
  openDocument(
    fileName: string,
    content: ArrayBuffer,
    options?: unknown
  ): Promise<boolean>
  openUrl(url: string, options?: unknown): Promise<boolean>
  newDocument(options?: unknown): Promise<boolean>
}

/** Outcome of {@link AcUiFileOpenSession.open}. */
export type AcUiFileOpenSessionResult =
  | { ok: true }
  | { ok: false; error?: unknown }

export type AcUiFileOpenSessionOptions = Omit<
  AcUiFileOpenLandingOptions,
  'onOpen'
> & {
  /**
   * Lazily creates (or returns) the viewer DocManager.
   * Called once on the first open; subsequent opens reuse the instance.
   */
  createDocManager: () => Promise<AcUiFileOpenDocManager>
  /** Optional options object passed to openDocument / openUrl / newDocument. */
  getOpenOptions?: () => unknown
  /** Runs before ensure/open (e.g. show a loading indicator). */
  onBeforeOpen?: (request: AcUiFileOpenRequest) => void | Promise<void>
  /**
   * Runs after DocManager is ready and sources are attached, immediately
   * before `openDocument` / `openUrl` / `newDocument` (e.g. set OPENPROF).
   */
  onPrepareOpen?: (
    request: AcUiFileOpenRequest,
    docManager: AcUiFileOpenDocManager
  ) => void | Promise<void>
  /** Runs after open settles (success or failure). */
  onAfterOpen?: (
    request: AcUiFileOpenRequest,
    result: AcUiFileOpenSessionResult
  ) => void | Promise<void>
}

/**
 * Landing + lazy DocManager session.
 *
 * On each open request the session:
 * 1. Calls {@link AcUiFileOpenSessionOptions.createDocManager} once
 * 2. Attaches landing cloud sources onto the DocManager registry
 * 3. Runs `openDocument` / `openUrl` / `newDocument`
 *
 * The `/file-open-panel` entry stays light — the host supplies DocManager via
 * dynamic `import('@mlightcad/cad-simple-viewer')` inside `createDocManager`.
 */
export class AcUiFileOpenSession {
  readonly landing: AcUiFileOpenLanding

  private readonly options: AcUiFileOpenSessionOptions
  private docManager: AcUiFileOpenDocManager | null = null
  private ensurePromise: Promise<AcUiFileOpenDocManager> | null = null
  /** Bumped on {@link dispose} so in-flight `createDocManager` results are dropped. */
  private ensureGeneration = 0
  /** Chains {@link open} calls so overlapping picks do not interleave. */
  private openTail: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(options: AcUiFileOpenSessionOptions) {
    this.options = options
    const {
      createDocManager: _createDocManager,
      getOpenOptions: _getOpenOptions,
      onBeforeOpen: _onBeforeOpen,
      onPrepareOpen: _onPrepareOpen,
      onAfterOpen: _onAfterOpen,
      ...landingOptions
    } = options

    this.landing = new AcUiFileOpenLanding({
      ...landingOptions,
      onOpen: request => {
        void this.open(request)
      }
    })
  }

  /** Landing data-source registry. */
  get manager(): AcApDataSourceManager {
    return this.landing.manager
  }

  /** Effective card theme. */
  get theme(): AcEdUiTheme {
    return this.landing.theme
  }

  /** Cached DocManager after the first successful {@link ensureDocManager}. */
  get docManagerInstance(): AcUiFileOpenDocManager | null {
    return this.docManager
  }

  /**
   * Registers a cloud (or custom) data source on the landing registry.
   *
   * When DocManager already exists, the same instance is attached there too
   * so late async plugin registration still reaches in-viewer File → Open.
   *
   * @param source - Source to register
   */
  registerSource(source: AcApDataSource): void {
    if (this.disposed) return
    this.landing.registerSource(source)
    if (this.docManager) {
      this.landing.attachSourcesTo(this.docManager.dataSourceManager)
      this.landing.refreshSourceButtons()
    }
  }

  /**
   * Removes a data source from the landing registry (and DocManager when ready).
   *
   * @param id - Source id
   */
  unregisterSource(id: string): void {
    if (this.disposed) return
    this.landing.unregisterSource(id)
    this.docManager?.dataSourceManager.unregister(id)
  }

  setTheme(theme: AcEdUiTheme | undefined): void {
    this.landing.setTheme(theme)
  }

  refreshSourceButtons(): void {
    this.landing.refreshSourceButtons()
  }

  /**
   * Ensures DocManager exists and landing sources are attached.
   *
   * @returns The DocManager instance
   */
  async ensureDocManager(): Promise<AcUiFileOpenDocManager> {
    if (this.disposed) {
      throw new Error('AcUiFileOpenSession is disposed')
    }
    if (this.docManager) return this.docManager
    if (!this.ensurePromise) {
      const generation = this.ensureGeneration
      this.ensurePromise = this.options
        .createDocManager()
        .then(dm => {
          if (this.disposed || generation !== this.ensureGeneration) {
            throw new Error('AcUiFileOpenSession is disposed')
          }
          this.docManager = dm
          this.landing.attachSourcesTo(dm.dataSourceManager)
          this.landing.refreshSourceButtons()
          return dm
        })
        .catch(error => {
          this.ensurePromise = null
          throw error
        })
    }
    return this.ensurePromise
  }

  /**
   * Opens a normalized landing request (also used by the panel `onOpen` path).
   *
   * Concurrent calls are serialized so overlapping picks do not interleave
   * against the same DocManager.
   *
   * @param request - File / URL / new drawing intent
   */
  async open(
    request: AcUiFileOpenRequest
  ): Promise<AcUiFileOpenSessionResult> {
    const run = () => this.openExclusive(request)
    const resultPromise = this.openTail.then(run, run)
    this.openTail = resultPromise.then(
      () => undefined,
      () => undefined
    )
    return resultPromise
  }

  private async openExclusive(
    request: AcUiFileOpenRequest
  ): Promise<AcUiFileOpenSessionResult> {
    if (this.disposed) {
      return { ok: false, error: new Error('AcUiFileOpenSession is disposed') }
    }

    await this.options.onBeforeOpen?.(request)

    let result: AcUiFileOpenSessionResult
    try {
      const dm = await this.ensureDocManager()
      if (this.disposed) {
        return {
          ok: false,
          error: new Error('AcUiFileOpenSession is disposed')
        }
      }
      await this.options.onPrepareOpen?.(request, dm)
      const openOptions = this.options.getOpenOptions?.()
      let success = false

      if (request.kind === 'file') {
        const content = await request.file.arrayBuffer()
        success = await dm.openDocument(
          request.file.name,
          content,
          openOptions
        )
      } else if (request.kind === 'url') {
        success = await dm.openUrl(request.url, openOptions)
      } else {
        success = await dm.newDocument(openOptions)
      }

      // `false` usually means the viewer already reported via event bus
      // (`failed-to-open-file`); avoid inventing a duplicate error here.
      result = success ? { ok: true } : { ok: false }
    } catch (error) {
      result = { ok: false, error }
    }

    await this.options.onAfterOpen?.(request, result)
    return result
  }

  /**
   * Disposes the landing panel.
   *
   * In-flight {@link ensureDocManager} / {@link open} calls observe disposal and
   * stop attaching sources or opening; the host still owns any DocManager that
   * `createDocManager` already constructed.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.ensureGeneration += 1
    this.ensurePromise = null
    this.landing.dispose()
  }
}

/**
 * Creates a landing + lazy DocManager session.
 *
 * @param options - Session options including {@link createDocManager}
 */
export function acuiCreateFileOpenSession(
  options: AcUiFileOpenSessionOptions
): AcUiFileOpenSession {
  return new AcUiFileOpenSession(options)
}
