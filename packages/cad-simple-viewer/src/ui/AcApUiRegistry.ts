import { AcCmEventManager } from '@mlightcad/data-model'

import {
  AcApI18n,
  type AcApLocale,
  type AcApLocaleMessage
} from '../i18n/AcApI18n.js'

/** Where a new ribbon group sits relative to the groups the host already built. */
export type AcApUiPlacement = 'start' | 'end'

/**
 * One ribbon button or dropdown entry declared by a plugin.
 *
 * Hosts translate {@link labelKey}. Set {@link label} when the text is already
 * localized (OCR provider names, for example).
 */
export interface AcApUiRibbonItem {
  /** Stable id. Hosts use it as the ribbon item id and the click target. */
  id: string
  /** Command passed to `sendStringToExecute` when the item is clicked. */
  command?: string
  /** Dotted {@link AcApI18n} key for the label. */
  labelKey?: string
  /** Already-localized label. Wins over {@link labelKey}. */
  label?: string
  /** Dotted {@link AcApI18n} key for the tooltip. */
  tooltipKey?: string
  /** Raw SVG markup. Hosts turn it into their own icon type. */
  iconSvg?: string
  /** Ribbon button size. Hosts choose a default when omitted. */
  size?: 'large' | 'small'
  /**
   * Called instead of {@link command} when the item needs work the command
   * line cannot express (choosing an OCR provider, for example).
   */
  invoke?: () => void | Promise<void>
  /** Static dropdown entries. */
  children?: AcApUiRibbonItem[]
  /**
   * Dropdown entries read when the host rebuilds, so the list can follow
   * another registry (OCR providers).
   */
  childrenProvider?: () => AcApUiRibbonItem[]
  /**
   * When set, simple UI also places this item on the toolbar.
   * `after` is an existing toolbar item id to insert after.
   */
  toolbar?: boolean | { after?: string }
}

/** A ribbon group, or items merged into a group the host already has. */
export interface AcApUiRibbonGroup {
  /** Group id. With {@link merge}, this is the host group to append to. */
  id: string
  /** Plugin that registered the group. */
  plugin: string
  /** Tab id. An unknown id creates a tab when {@link tabTitleKey} is set. */
  tabId: string
  /** Dotted key for a tab this contribution creates. */
  tabTitleKey?: string
  /** Dotted key for the group title. Omitted when {@link merge} is set. */
  titleKey?: string
  /**
   * Append {@link items} to the host group with this {@link id} instead of
   * creating a group.
   */
  merge?: boolean
  /** Where to put a new group. Defaults to `'end'`. */
  placement?: AcApUiPlacement
  /** Sort key among groups that share a tab and {@link placement}. */
  order?: number
  items: AcApUiRibbonItem[]
}

/** One file-menu (or other menu) row declared by a plugin. */
export interface AcApUiMenuItem {
  id: string
  /** Plugin that registered the item. */
  plugin: string
  /** Parent menu id. Export rows use `file.export`. */
  parentId: string
  /** Dotted {@link AcApI18n} key for the label. */
  labelKey: string
  /** Command passed to `sendStringToExecute` when the row is chosen. */
  command?: string
  /** Raw SVG markup. */
  iconSvg?: string
  /** Sort key among rows that share a {@link parentId}. */
  order?: number
  /** Called instead of {@link command} when the row needs custom work. */
  invoke?: () => void | Promise<void>
}

/**
 * A palette tab whose content the plugin mounts into a host-provided element.
 */
export interface AcApUiPalette {
  /** Tab id. Also the id passed to `AcApPaletteService.openNamedTab`. */
  id: string
  /** Plugin that registered the palette. */
  plugin: string
  /** Dotted {@link AcApI18n} key for the tab label. */
  titleKey: string
  /** Dotted key for the palette header. Falls back to {@link titleKey}. */
  headerTitleKey?: string
  /** Sort key among palette tabs. */
  order?: number
  /**
   * Fills `container` the first time the host shows the tab.
   *
   * @returns A function the host calls when the tab is destroyed.
   */
  mount: (
    container: HTMLElement
  ) => void | (() => void) | Promise<void | (() => void)>
}

/** Locale catalogs shipped with a contribution, keyed by locale. */
export type AcApUiMessages = Partial<Record<AcApLocale, AcApLocaleMessage>>

/**
 * Everything a plugin's `/register` module declares before the heavy module
 * loads. Buttons stay visible for as long as this registration does.
 */
export interface AcApUiContribution {
  /** Unique plugin name. A second call replaces the previous contribution. */
  plugin: string
  ribbonGroups?: ReadonlyArray<Omit<AcApUiRibbonGroup, 'plugin'>>
  menuItems?: ReadonlyArray<Omit<AcApUiMenuItem, 'plugin'>>
  palettes?: ReadonlyArray<Omit<AcApUiPalette, 'plugin'>>
  /**
   * Message trees merged into {@link AcApI18n} and retained so a Vue host can
   * merge the same trees into vue-i18n.
   */
  messages?: AcApUiMessages
}

/** Payload for {@link AcApUiRegistry.events.changed}. */
export interface AcApUiChangedEventArgs {
  /** Plugin whose contribution changed. */
  plugin: string
  /** `update` means the same contribution asked hosts to rebuild. */
  type: 'register' | 'unregister' | 'update'
}

interface AcApUiPack {
  plugin: string
  generation: number
  ribbonGroups: AcApUiRibbonGroup[]
  menuItems: AcApUiMenuItem[]
  palettes: AcApUiPalette[]
  messages?: AcApUiMessages
}

/**
 * Framework-free UI contributions from plugins.
 *
 * A plugin's lightweight `/register` module calls {@link register} so ribbon
 * buttons, menu rows, and palette tabs exist before the plugin body loads.
 * Hosts listen to {@link events.changed} and rebuild. Nothing is shown for a
 * plugin that never registers.
 */
export class AcApUiRegistry {
  private static readonly packs = new Map<string, AcApUiPack>()
  private static generation = 0

  /** Fired when a contribution is added, removed, or asked to rebuild. */
  static readonly events = {
    changed: new AcCmEventManager<AcApUiChangedEventArgs>()
  }

  /**
   * Registers (or replaces) one plugin's UI contribution.
   *
   * @param contribution - Ribbon groups, menu rows, palettes, and messages.
   * @returns A function that removes this registration. A stale function left
   * over from a replaced registration does nothing.
   */
  static register(contribution: AcApUiContribution): () => void {
    const plugin = contribution.plugin.trim()
    if (!plugin) {
      throw new Error('[AcApUiRegistry] Plugin name is required')
    }
    const generation = ++this.generation
    const pack: AcApUiPack = {
      plugin,
      generation,
      ribbonGroups: (contribution.ribbonGroups ?? []).map(group => ({
        ...group,
        plugin,
        items: group.items.map(item => ({ ...item }))
      })),
      menuItems: (contribution.menuItems ?? []).map(item => ({
        ...item,
        plugin
      })),
      palettes: (contribution.palettes ?? []).map(palette => ({
        ...palette,
        plugin
      })),
      messages: contribution.messages
    }
    this.packs.set(plugin, pack)
    this.mergeMessages(pack.messages)
    this.events.changed.dispatch({ plugin, type: 'register' })
    return () => {
      const current = this.packs.get(plugin)
      if (!current || current.generation !== generation) return
      this.packs.delete(plugin)
      this.events.changed.dispatch({ plugin, type: 'unregister' })
    }
  }

  /**
   * Asks hosts to rebuild a plugin that is already registered.
   *
   * Used when dropdown children change without a new {@link register} call,
   * for example after an OCR provider list refresh.
   *
   * @param plugin - Plugin name passed to {@link register}.
   */
  static touch(plugin: string): void {
    if (!this.packs.has(plugin)) return
    this.events.changed.dispatch({ plugin, type: 'update' })
  }

  /**
   * Removes every contribution from `plugin`.
   *
   * @param plugin - Plugin name passed to {@link register}.
   * @returns `true` when a contribution was removed.
   */
  static clearPlugin(plugin: string): boolean {
    if (!this.packs.delete(plugin)) return false
    this.events.changed.dispatch({ plugin, type: 'unregister' })
    return true
  }

  /**
   * Removes every contribution.
   *
   * Tests use this between cases. Hosts do not need it.
   */
  static reset(): void {
    if (this.packs.size === 0) return
    this.packs.clear()
    this.events.changed.dispatch({ plugin: '', type: 'unregister' })
  }

  /** Ribbon groups in registration order. */
  static ribbonGroups(): readonly AcApUiRibbonGroup[] {
    const groups: AcApUiRibbonGroup[] = []
    for (const pack of this.packs.values()) {
      groups.push(...pack.ribbonGroups)
    }
    return groups
  }

  /**
   * Menu rows, optionally limited to one parent, sorted by {@link AcApUiMenuItem.order}.
   *
   * @param parentId - When set, only rows for that menu are returned.
   */
  static menuItems(parentId?: string): readonly AcApUiMenuItem[] {
    const items: AcApUiMenuItem[] = []
    for (const pack of this.packs.values()) {
      for (const item of pack.menuItems) {
        if (parentId === undefined || item.parentId === parentId) {
          items.push(item)
        }
      }
    }
    return sortByOrder(items)
  }

  /** Palette tabs sorted by {@link AcApUiPalette.order}. */
  static palettes(): readonly AcApUiPalette[] {
    const palettes: AcApUiPalette[] = []
    for (const pack of this.packs.values()) {
      palettes.push(...pack.palettes)
    }
    return sortByOrder(palettes)
  }

  /**
   * The palette with `id`, if a plugin registered one.
   *
   * @param id - Palette id.
   */
  static palette(id: string): AcApUiPalette | undefined {
    for (const pack of this.packs.values()) {
      const found = pack.palettes.find(palette => palette.id === id)
      if (found) return found
    }
    return undefined
  }

  /** Message trees still registered, in registration order. */
  static localeMessages(): ReadonlyArray<{
    plugin: string
    messages: AcApUiMessages
  }> {
    const result: Array<{ plugin: string; messages: AcApUiMessages }> = []
    for (const pack of this.packs.values()) {
      if (pack.messages) {
        result.push({ plugin: pack.plugin, messages: pack.messages })
      }
    }
    return result
  }

  private static mergeMessages(messages: AcApUiMessages | undefined): void {
    if (!messages) return
    for (const locale of Object.keys(messages) as AcApLocale[]) {
      const tree = messages[locale]
      if (tree) AcApI18n.mergeLocaleMessage(locale, tree)
    }
  }
}

/**
 * Inserts plugin ribbon groups into host tabs.
 *
 * New groups with `placement: 'start'` are inserted before the host groups,
 * the rest after them. A group with `merge` appends its items to the host
 * group of the same id. A tab id the host does not have yet is created.
 *
 * @param tabs - Host tabs. This function does not mutate the input arrays.
 * @param contributions - Groups from {@link AcApUiRegistry.ribbonGroups}.
 * @param adapt - Host-specific constructors. `appendItems` may mutate `group`.
 */
export function acapMergeRibbonContributions<
  TTab extends { id: string; groups: TGroup[] },
  TGroup extends { id: string }
>(
  tabs: readonly TTab[],
  contributions: readonly AcApUiRibbonGroup[],
  adapt: {
    createTab: (tabId: string, tabTitleKey: string | undefined) => TTab
    createGroup: (source: AcApUiRibbonGroup) => TGroup
    appendItems: (group: TGroup, source: AcApUiRibbonGroup) => void
  }
): TTab[] {
  const byTab = new Map<string, AcApUiRibbonGroup[]>()
  for (const group of contributions) {
    const list = byTab.get(group.tabId)
    if (list) list.push(group)
    else byTab.set(group.tabId, [group])
  }

  const merged = tabs.map(tab => ({
    ...tab,
    groups: [...tab.groups]
  }))

  for (const [tabId, groups] of byTab) {
    let tab = merged.find(item => item.id === tabId)
    if (!tab) {
      const titleKey = groups.find(group => group.tabTitleKey)?.tabTitleKey
      tab = adapt.createTab(tabId, titleKey)
      merged.push(tab)
    }
    applyGroups(tab, groups, adapt)
  }
  return merged
}

/**
 * Inserts plugin menu rows into a host menu.
 *
 * Rows are sorted by {@link AcApUiMenuItem.order} and inserted before
 * `insertBeforeId` when that id exists, otherwise appended.
 *
 * @param items - Host rows. Not mutated.
 * @param contributions - Rows from {@link AcApUiRegistry.menuItems}.
 * @param parentId - Only rows with this parent are inserted.
 * @param createItem - Builds a host row from a contribution.
 * @param insertBeforeId - Host row id that plugin rows should precede.
 */
export function acapMergeMenuContributions<T extends { id: string }>(
  items: readonly T[],
  contributions: readonly AcApUiMenuItem[],
  parentId: string,
  createItem: (source: AcApUiMenuItem) => T,
  insertBeforeId?: string
): T[] {
  const extra = sortByOrder(
    contributions.filter(item => item.parentId === parentId)
  ).map(createItem)
  if (extra.length === 0) return [...items]
  const next = [...items]
  const index =
    insertBeforeId === undefined
      ? -1
      : next.findIndex(item => item.id === insertBeforeId)
  if (index < 0) next.push(...extra)
  else next.splice(index, 0, ...extra)
  return next
}

/**
 * Ribbon items that simple UI should also show on the toolbar, in
 * registration order.
 *
 * @param groups - Groups from {@link AcApUiRegistry.ribbonGroups}.
 */
export function acapToolbarItems(
  groups: readonly AcApUiRibbonGroup[]
): AcApUiRibbonItem[] {
  const items: AcApUiRibbonItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.toolbar) items.push(item)
    }
  }
  return items
}

function applyGroups<TGroup extends { id: string }>(
  tab: { groups: TGroup[] },
  groups: readonly AcApUiRibbonGroup[],
  adapt: {
    createGroup: (source: AcApUiRibbonGroup) => TGroup
    appendItems: (group: TGroup, source: AcApUiRibbonGroup) => void
  }
): void {
  const merging = groups.filter(group => group.merge)
  const creating = groups.filter(group => !group.merge)
  for (const source of merging) {
    const existing = tab.groups.find(group => group.id === source.id)
    if (existing) adapt.appendItems(existing, source)
    else tab.groups.push(adapt.createGroup(source))
  }
  const start = sortByOrder(
    creating.filter(group => group.placement === 'start')
  )
  const end = sortByOrder(creating.filter(group => group.placement !== 'start'))
  tab.groups = [
    ...start.map(group => adapt.createGroup(group)),
    ...tab.groups,
    ...end.map(group => adapt.createGroup(group))
  ]
}

function sortByOrder<T extends { order?: number }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order ?? Number.POSITIVE_INFINITY
      const bo = b.item.order ?? Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
      return a.index - b.index
    })
    .map(entry => entry.item)
}
