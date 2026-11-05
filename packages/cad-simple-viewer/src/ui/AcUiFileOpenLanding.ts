import type { AcApDataSourceMenuItem } from '../app/dataSource/acapBuildDataSourceMenu'
import type {
  AcApDataSource,
  AcApDataSourceAccountProfile
} from '../app/dataSource/AcApDataSource'
import { AcApDataSourceManager } from '../app/dataSource/AcApDataSourceManager'
import { acapInvokeDataSourceMenuAction } from '../app/dataSource/acapInvokeDataSourceMenuAction'
import type { AcEdUiTheme } from '../editor/global/AcEdUiTheme'
import {
  AcUiFileOpenPanel,
  type AcUiFileOpenPanelCardSize
} from './AcUiFileOpenPanel'

/**
 * Normalized open intent emitted by {@link AcUiFileOpenLanding}.
 *
 * Auth actions (sign-in / sign-out) never produce a request — the landing
 * refreshes the panel chrome instead.
 */
export type AcUiFileOpenRequest =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }
  | { kind: 'new' }

/**
 * Options for {@link AcUiFileOpenLanding}.
 *
 * Owns an {@link AcApDataSourceManager} and an {@link AcUiFileOpenPanel} so
 * hosts only handle {@link onOpen} plus optional cloud source registration.
 */
export interface AcUiFileOpenLandingOptions {
  /** Element that receives the panel root. */
  host: HTMLElement
  /**
   * Called for local file, URL, new drawing, or a successful cloud **pick**.
   * Sign-in / sign-out are handled inside the landing and do not call this.
   */
  onOpen: (request: AcUiFileOpenRequest) => void
  /** Accepted extensions for the drop zone / file input. */
  accept?: string
  /** Optional title above the actions. */
  title?: string
  /** Optional subtitle under the title. */
  subtitle?: string
  /**
   * Card palette (`light` / `dark`). Omit to follow the host / document theme.
   */
  theme?: AcEdUiTheme
  /** Card box size. Numbers are treated as CSS pixels. */
  cardSize?: AcUiFileOpenPanelCardSize
  /** When true, URL is available in the source menu. Defaults to true. */
  showUrl?: boolean
  /** When true, shows a New Drawing button. Defaults to false. */
  showNewDrawing?: boolean
  /**
   * Extra cloud menu items when a source is not yet registered.
   * Prefer {@link AcUiFileOpenLanding.registerSource} for real sources.
   */
  extraMenuItems?:
    | AcApDataSourceMenuItem[]
    | (() => AcApDataSourceMenuItem[])
  /**
   * Optional account profile override. Prefer
   * {@link AcApDataSource.getAccountProfile}.
   */
  getAccountProfile?: (
    sourceId: string
  ) => AcApDataSourceAccountProfile | undefined
  /**
   * Optional pre-built registry. When omitted, the landing creates its own
   * {@link AcApDataSourceManager}.
   */
  manager?: AcApDataSourceManager
}

/**
 * Re-registers every source from one manager onto another so landing-page
 * cloud clients (MSAL / GIS) are reused after DocManager exists.
 *
 * Sources already present on {@link target} under the same id are skipped.
 *
 * @param from - Landing (or other) registry
 * @param target - Destination registry (usually DocManager.dataSourceManager)
 */
export function acuiAttachDataSources(
  from: AcApDataSourceManager,
  target: AcApDataSourceManager
): void {
  if (from === target) return
  for (const source of from.list()) {
    if (target.get(source.id) === source) continue
    target.register(source)
  }
}

/**
 * DocManager-free landing facade around {@link AcUiFileOpenPanel}.
 *
 * - Owns a data-source registry for cloud providers before the viewer exists
 * - Routes local / URL / new / cloud pick into a single {@link onOpen} callback
 * - Re-attaches the same source instances to DocManager via
 *   {@link attachSourcesTo} after the viewer is created
 */
export class AcUiFileOpenLanding {
  readonly manager: AcApDataSourceManager
  readonly panel: AcUiFileOpenPanel

  private readonly options: AcUiFileOpenLandingOptions
  private disposed = false

  constructor(options: AcUiFileOpenLandingOptions) {
    this.options = options
    this.manager = options.manager ?? new AcApDataSourceManager()

    this.panel = new AcUiFileOpenPanel({
      host: options.host,
      accept: options.accept,
      title: options.title,
      subtitle: options.subtitle,
      theme: options.theme,
      cardSize: options.cardSize,
      showUrl: options.showUrl,
      showNewDrawing: options.showNewDrawing,
      extraMenuItems: options.extraMenuItems,
      getAccountProfile: options.getAccountProfile,
      manager: this.manager,
      onLocalFile: file => {
        this.emitOpen({ kind: 'file', file })
      },
      onUrl: url => {
        this.emitOpen({ kind: 'url', url })
      },
      onNewDrawing: () => {
        this.emitOpen({ kind: 'new' })
      },
      onDataSourceAction: item => {
        void this.handleDataSourceAction(item)
      }
    })
  }

  /** Effective card theme (locked option, or resolved from the host). */
  get theme(): AcEdUiTheme {
    return this.panel.theme
  }

  /** Panel root element. */
  get element(): HTMLDivElement {
    return this.panel.element
  }

  /**
   * Registers a cloud (or custom) data source on the landing registry.
   *
   * @param source - Source to register (same instance can later be attached
   *   to DocManager via {@link attachSourcesTo})
   */
  registerSource(source: AcApDataSource): void {
    if (this.disposed) return
    this.manager.register(source)
  }

  /**
   * Removes a data source from the landing registry.
   *
   * @param id - Source id previously passed to {@link registerSource}
   */
  unregisterSource(id: string): void {
    if (this.disposed) return
    this.manager.unregister(id)
  }

  /**
   * Re-registers every landing source onto another manager (typically
   * `AcApDocManager.instance.dataSourceManager`) so MSAL / GIS clients are
   * not duplicated after the viewer is created.
   *
   * Sources already present on the target under the same id are skipped.
   *
   * @param target - Destination registry
   */
  attachSourcesTo(target: AcApDataSourceManager): void {
    if (this.disposed) return
    acuiAttachDataSources(this.manager, target)
  }

  /**
   * Sets a locked card theme, or `undefined` to follow the host app theme.
   *
   * @param theme - `light`, `dark`, or `undefined`
   */
  setTheme(theme: AcEdUiTheme | undefined): void {
    if (this.disposed) return
    this.panel.setTheme(theme)
  }

  /** Rebuilds the source menu and active body content. */
  refreshSourceButtons(): void {
    if (this.disposed) return
    this.panel.refreshSourceButtons()
  }

  /** Removes the panel from the host and releases the landing. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.panel.dispose()
  }

  private emitOpen(request: AcUiFileOpenRequest): void {
    if (this.disposed) return
    this.options.onOpen(request)
  }

  private async handleDataSourceAction(
    item: AcApDataSourceMenuItem
  ): Promise<void> {
    if (this.disposed) return
    const source = this.manager.get(item.sourceId)
    if (!source) return

    try {
      const file = await acapInvokeDataSourceMenuAction(source, item)
      if (this.disposed) return
      if (item.action !== 'pick' || !file) {
        this.refreshSourceButtons()
        return
      }
      if (file.content) {
        this.emitOpen({
          kind: 'file',
          file: new File([file.content], file.name)
        })
        return
      }
      if (file.url) {
        this.emitOpen({ kind: 'url', url: file.url })
      }
    } catch {
      // Hosts can observe source errors via their own logging; keep the
      // landing UI responsive after a cancelled / failed cloud action.
      this.refreshSourceButtons()
    }
  }
}
