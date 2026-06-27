import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  AcApPlugin,
  AcEdCommandStack,
  type AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import { AcApLayerUiCmd } from './command/AcApLayerUiCmd'
import { resolveToolbarItems } from './config/resolveToolbarItems'
import {
  AcExSimpleUiPluginOptions,
  AcExToolbarPlacement,
  SIMPLE_UI_PLUGIN_NAME
} from './config/types'
import { AcExI18n, registerSimpleUiI18n } from './i18n'
import { AcExLayerService } from './service/AcExLayerService'
import { AcExUiThemeSync } from './theme/AcExUiThemeSync'
import { AcExLayerManager } from './ui/AcExLayerManager'
import { AcExToolbar } from './ui/AcExToolbar'
import { removeUiStylesIfUnused } from './ui/styles'

/**
 * CAD viewer plugin that adds a framework-agnostic toolbar and layer manager.
 *
 * Registers the `layer` command, injects shared UI styles, and keeps theme and
 * locale in sync with {@link AcApI18n} and the `COLORTHEME` system variable.
 */
export class AcApSimpleUiPlugin implements AcApPlugin {
  /** {@link SIMPLE_UI_PLUGIN_NAME} */
  name = SIMPLE_UI_PLUGIN_NAME
  /** Plugin semver string. */
  version = packageJson.version
  /** Human-readable plugin summary. */
  description = 'Framework-agnostic toolbar and layer manager UI'

  /** Layer table observer backing the layer manager panel. */
  private layerService?: AcExLayerService
  /** Floating layer manager DOM panel. */
  private layerManager?: AcExLayerManager
  /** Configurable toolbar instance. */
  private toolbar?: AcExToolbar
  /** Scoped i18n helper for plugin strings. */
  private i18n?: AcExI18n
  /** Syncs UI theme with host attribute and database sysvar. */
  private themeSync?: AcExUiThemeSync
  /** Current toolbar edge placement (mutable via toolbar settings button). */
  private toolbarPlacement: AcExToolbarPlacement = 'right'
  /** Commands registered during {@link onLoad} for cleanup on unload. */
  private registeredCommands: Array<{ group: string; name: string }> = []
  /** Refreshes toolbar and layer manager when the app locale changes. */
  private handleLocaleChanged = () => {
    this.layerManager?.refreshLocale()
    this.toolbar?.refresh()
  }

  /**
   * @param options - Toolbar, layer manager, and host configuration.
   */
  constructor(private readonly options: AcExSimpleUiPluginOptions = {}) {}

  /**
   * Creates UI components, registers commands, and starts theme sync.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register `layer`.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    registerSimpleUiI18n()

    const resolvedOptions = this.normalizeOptions()
    const host =
      resolvedOptions.host ??
      AcApDocManager.instance.curView?.container ??
      document.body

    this.toolbarPlacement = resolvedOptions.toolbar?.placement ?? 'right'

    this.themeSync = new AcExUiThemeSync(host, () => this.toolbar?.refresh())
    this.themeSync.start()

    this.i18n = new AcExI18n()
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)

    const layerEnabled = resolvedOptions.layerManager?.enabled !== false
    if (layerEnabled) {
      this.layerService = new AcExLayerService()
      this.layerManager = new AcExLayerManager({
        layerService: this.layerService,
        i18n: this.i18n,
        host,
        toolbarPlacement: this.toolbarPlacement,
        allowMoveOutsideCanvas:
          resolvedOptions.layerManager?.allowMoveOutsideCanvas ?? false
      })

      const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
      commandManager.addCommand(
        group,
        'layer',
        'layer',
        new AcApLayerUiCmd(this.layerManager)
      )
      this.registeredCommands.push({ group, name: 'layer' })
    }

    const toolbarEnabled = resolvedOptions.toolbar?.enabled !== false
    if (toolbarEnabled) {
      const toolbarContext = {
        getTheme: () => this.themeSync?.getTheme() ?? 'dark',
        setTheme: (theme: AcEdUiTheme) => this.themeSync?.setTheme(theme),
        getLocale: () => AcApI18n.currentLocale,
        toggleLocale: () => this.toggleLocale(),
        getPlacement: () => this.toolbarPlacement,
        setPlacement: (placement: AcExToolbarPlacement) =>
          this.setToolbarPlacement(placement)
      }
      const items = resolveToolbarItems(resolvedOptions.toolbar, toolbarContext)
      this.toolbar = new AcExToolbar({
        host,
        placement: this.toolbarPlacement,
        items,
        i18n: this.i18n,
        onCommand: command => {
          AcApDocManager.instance.sendStringToExecute(command)
        }
      })
    }
  }

  /** Updates toolbar placement and repositions the layer manager when applicable. */
  private setToolbarPlacement(placement: AcExToolbarPlacement) {
    this.toolbarPlacement = placement
    this.toolbar?.setPlacement(placement)
    this.layerManager?.setToolbarPlacement(placement)
  }

  /**
   * Tears down UI, unregisters commands, and removes injected styles if unused.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to remove registered commands.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)

    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    this.toolbar?.destroy()
    this.layerManager?.destroy()
    this.layerService?.destroy()

    this.toolbar = undefined
    this.layerManager = undefined
    this.layerService = undefined
    this.i18n = undefined
    this.themeSync?.stop()
    this.themeSync = undefined

    removeUiStylesIfUnused()
  }

  /** Toggles {@link AcApI18n.currentLocale} between English and Chinese. */
  private toggleLocale() {
    const next: AcApLocale =
      AcApI18n.currentLocale === 'en' ? 'zh' : 'en'
    AcApI18n.setCurrentLocale(next)
  }

  /**
   * Fills in default option values for toolbar and layer manager sections.
   *
   * @returns Resolved options with explicit boolean defaults.
   */
  private normalizeOptions(): Required<
    Omit<AcExSimpleUiPluginOptions, 'host' | 'locale'>
  > & {
    host?: HTMLElement
  } {
    return {
      host: this.options.host,
      toolbar: {
        enabled: this.options.toolbar?.enabled ?? true,
        placement: this.options.toolbar?.placement ?? 'right',
        items: this.options.toolbar?.items ?? 'default',
        appendItems: this.options.toolbar?.appendItems
      },
      layerManager: {
        enabled: this.options.layerManager?.enabled ?? true,
        allowMoveOutsideCanvas:
          this.options.layerManager?.allowMoveOutsideCanvas ?? false
      }
    }
  }
}

/**
 * Factory for {@link AcApSimpleUiPlugin}.
 *
 * @param options - Plugin configuration.
 * @returns A new plugin instance ready for {@link AcApPluginManager.loadPlugin}.
 */
export function createSimpleUiPlugin(
  options: AcExSimpleUiPluginOptions = {}
): AcApSimpleUiPlugin {
  return new AcApSimpleUiPlugin(options)
}
