import {
  AcApDocManager,
  AcApI18n,
  acapMergeMenuContributions,
  acapMergeRibbonContributions,
  AcApUiRegistry,
  type AcApUiRibbonGroup,
  type AcApUiRibbonItem
} from '@mlightcad/cad-simple-viewer'
import type {
  FileMenuItemModel,
  RibbonGroupModel,
  RibbonItemModel,
  RibbonTabModel
} from '@mlightcad/ribbon'

import { mlSvgIcon } from './pluginUi'

/** What a plugin ribbon or menu item does when it is clicked. */
export interface MlPluginUiAction {
  command?: string
  invoke?: () => void | Promise<void>
}

/**
 * Inserts registered plugin groups into host ribbon tabs and records how each
 * item should run.
 *
 * @param tabs - Tabs the editor built for its own commands.
 */
export function mlApplyPluginRibbon(tabs: RibbonTabModel[]): {
  tabs: RibbonTabModel[]
  actions: Map<string, MlPluginUiAction>
} {
  const actions = new Map<string, MlPluginUiAction>()
  const hostTabs = tabs.map(tab => ({
    ...tab,
    groups: [...(tab.groups ?? [])]
  }))
  const merged = acapMergeRibbonContributions(
    hostTabs,
    AcApUiRegistry.ribbonGroups(),
    {
      createTab: (tabId, tabTitleKey) => ({
        id: tabId,
        title: tabTitleKey ? AcApI18n.t(tabTitleKey) : tabId,
        groups: []
      }),
      createGroup: source => ribbonGroup(source, actions),
      appendItems: (group, source) => {
        const items = source.items.map(item => ribbonItem(item, actions))
        const collection = group.collections?.[0]
        if (collection) {
          collection.items.push(...items)
          return
        }
        group.collections = [{ id: `${group.id}-plugin`, layout: 'row', items }]
      }
    }
  )
  return { tabs: merged, actions }
}

/**
 * File-menu rows for one parent, ready to drop into the editor menu.
 *
 * @param items - Host rows.
 * @param parentId - Contribution parent, such as `file.export`.
 * @param insertBeforeId - Host row the plugin rows should precede.
 */
export function mlApplyPluginMenu(
  items: FileMenuItemModel[],
  parentId: string,
  insertBeforeId?: string
): FileMenuItemModel[] {
  return acapMergeMenuContributions(
    items,
    AcApUiRegistry.menuItems(),
    parentId,
    item => ({
      id: item.id,
      label: AcApI18n.t(item.labelKey)
    }),
    insertBeforeId
  )
}

/**
 * Runs a plugin menu row. Returns false when `id` is not a contribution.
 *
 * @param id - Menu item id from the file menu.
 */
export function mlRunPluginMenuItem(id: string): boolean {
  const item = AcApUiRegistry.menuItems().find(entry => entry.id === id)
  if (!item) return false
  if (item.invoke) {
    void item.invoke()
    return true
  }
  if (!item.command) return false
  AcApDocManager.instance.sendStringToExecute(item.command)
  return true
}

function ribbonGroup(
  source: AcApUiRibbonGroup,
  actions: Map<string, MlPluginUiAction>
): RibbonGroupModel {
  return {
    id: source.id,
    title: source.titleKey ? AcApI18n.t(source.titleKey) : source.id,
    orientation: 'row',
    collections: [
      {
        id: `${source.id}-main`,
        layout: 'row',
        items: source.items.map(item => ribbonItem(item, actions))
      }
    ]
  }
}

function ribbonItem(
  item: AcApUiRibbonItem,
  actions: Map<string, MlPluginUiAction>
): RibbonItemModel {
  remember(actions, item)
  const children = [
    ...(item.children ?? []),
    ...(item.childrenProvider?.() ?? [])
  ]
  for (const child of children) remember(actions, child)
  const label = itemLabel(item)
  const tooltip = item.tooltipKey ? AcApI18n.t(item.tooltipKey) : undefined
  const icon = item.iconSvg ? mlSvgIcon(item.iconSvg) : undefined
  const size = item.size === 'small' ? 'small' : 'large'
  if (children.length > 0) {
    return {
      id: item.id,
      type: 'dropdown',
      label,
      tooltip,
      size,
      props: {
        icon,
        labelWrapLines: 2,
        labelWrapWidth: 'max-content',
        options: children.map(child => ({
          id: child.id,
          value: child.id,
          label: itemLabel(child),
          tooltip: child.tooltipKey
            ? AcApI18n.t(child.tooltipKey)
            : itemLabel(child)
        }))
      }
    }
  }
  return {
    id: item.id,
    type: 'button',
    label,
    tooltip,
    size,
    props: {
      icon,
      labelWrapLines: 2,
      labelWrapWidth: 'max-content'
    }
  }
}

function itemLabel(item: AcApUiRibbonItem): string {
  if (item.label) return item.label
  if (item.labelKey) return AcApI18n.t(item.labelKey)
  return item.id
}

function remember(
  actions: Map<string, MlPluginUiAction>,
  item: AcApUiRibbonItem
) {
  if (!item.command && !item.invoke) return
  actions.set(item.id, { command: item.command, invoke: item.invoke })
}
