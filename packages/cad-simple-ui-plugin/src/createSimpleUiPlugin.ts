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
  isToolbarSeparatorItem,
  toolbarItemsIncludeItem
} from './config/toolbarItemUtils'
import {
  AcExSimpleUiPluginOptions,
  AcExToolbarItem,
  AcExToolbarPlacement,
  SIMPLE_UI_PLUGIN_NAME
} from './config/types'
import { AcExI18n, registerSimpleUiI18n } from './i18n'
import { AcExUiThemeSync } from './theme/AcExUiThemeSync'
import { AcExLayerManager } from './ui/AcExLayerManager'
import { AcExToolbar } from './ui/AcExToolbar'
import { removeUiStylesIfUnused } from './ui/styles'

/**
 * CAD viewer plugin that adds a framework-agnostic toolbar and layer manager.
 *
 * Registers the `layer` command when the toolbar includes a layer button, injects
 * shared UI styles, and keeps theme and locale in sync with {@link AcApI18n} and
 * the `COLORTHEME` system variable.
 */
export class AcApSimpleUiPlugin implements AcApPlugin {
  /** {@link SIMPLE_UI_PLUGIN_NAME} */
  name = SIMPLE_UI_PLUGIN_NAME
  /** Plugin semver string. */
  version = packageJson.version
  /** Human-readable plugin summary. */
  description = 'Framework-agnostic toolbar and layer manager UI'

  /** Layer list popover anchored to the toolbar layer button. */
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

    const toolbarEnabled = resolvedOptions.toolbar?.enabled !== false
    const toolbarContext = {
      getTheme: () => this.themeSync?.getTheme() ?? 'dark',
      setTheme: (theme: AcEdUiTheme) => this.themeSync?.setTheme(theme),
      getLocale: () => AcApI18n.currentLocale,
      toggleLocale: () => this.toggleLocale(),
      getPlacement: () => this.toolbarPlacement,
      setPlacement: (placement: AcExToolbarPlacement) =>
        this.setToolbarPlacement(placement)
    }
    const toolbarItems = toolbarEnabled
      ? resolveToolbarItems(resolvedOptions.toolbar, toolbarContext)
      : []

    if (toolbarItemsIncludeItem(toolbarItems, 'layer')) {
      this.layerManager = new AcExLayerManager({
        editor: AcApDocManager.instance,
        i18n: this.i18n,
        host,
        toolbarPlacement: this.toolbarPlacement,
        resolveLayerAnchor: () => this.toolbar?.getLayerButtonAnchor()
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

    if (toolbarEnabled) {
      const items = this.withLayerPopoverAction(toolbarItems)
      this.toolbar = new AcExToolbar({
        host,
        placement: this.toolbarPlacement,
        items,
        i18n: this.i18n,
        collapsible: resolvedOptions.toolbar?.collapsible ?? false,
        defaultCollapsed: resolvedOptions.toolbar?.defaultCollapsed ?? false,
        onCollapse: () => {
          this.layerManager?.hide()
        },
        onCommand: command => {
          AcApDocManager.instance.sendStringToExecute(command)
        }
      })
    }
  }

  /**
   * Wires the built-in layer toolbar button to the layer manager popover.
   *
   * @param items - Resolved toolbar items.
   */
  private withLayerPopoverAction(items: AcExToolbarItem[]): AcExToolbarItem[] {
    if (!this.layerManager) return items

    return items.map(item => {
      if (isToolbarSeparatorItem(item)) return item

      let next = item
      if (item.id === 'layer') {
        next = {
          ...item,
          command: undefined,
          anchorAction: anchor => this.layerManager!.toggle(anchor)
        }
      }
      if (next.children?.length) {
        next = {
          ...next,
          children: this.withLayerPopoverAction(next.children)
        }
      }
      return next
    })
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

    this.toolbar = undefined
    this.layerManager = undefined
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
   * Fills in default option values for the toolbar section.
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
        appendItems: this.options.toolbar?.appendItems,
        collapsible: this.options.toolbar?.collapsible ?? false,
        defaultCollapsed: this.options.toolbar?.defaultCollapsed ?? false
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
