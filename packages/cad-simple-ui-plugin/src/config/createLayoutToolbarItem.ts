import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ICON_LAYOUT } from '@mlightcad/cad-simple-viewer/icons'
import { acdbHostApplicationServices } from '@mlightcad/data-model'

import { copyDynamicToolbarChildren } from './toolbarItemUtils'
import type { AcExToolbarItem } from './types'

/** One selectable drawing layout (model space or paper space). */
interface DocumentLayoutInfo {
  /** Display name from the layout table (e.g. `Model`, `Layout1`). */
  name: string
  /** Tab order used to sort the submenu. */
  tabOrder: number
  /** Block table record id passed to the layout manager. */
  blockTableRecordId: string
  /** Whether this layout is the document's current space. */
  isActive: boolean
}

/**
 * Lists layouts on the active document, including model space, sorted by tab order.
 *
 * @returns Layouts when a document is open; otherwise an empty list.
 */
export function listDocumentLayouts(): DocumentLayoutInfo[] {
  const database = AcApDocManager.instance.curDocument?.database
  const layoutTable = database?.objects?.layout
  if (!database || !layoutTable?.newIterator) return []

  const layouts: DocumentLayoutInfo[] = []
  for (const layout of database.objects.layout.newIterator()) {
    layouts.push({
      name: layout.layoutName,
      tabOrder: layout.tabOrder,
      blockTableRecordId: layout.blockTableRecordId,
      isActive: layout.blockTableRecordId === database.currentSpaceId
    })
  }
  layouts.sort((a, b) => a.tabOrder - b.tabOrder)
  return layouts
}

/**
 * Switches the current drawing to the layout identified by `blockTableRecordId`.
 *
 * @param blockTableRecordId - Layout block table record id.
 */
export function switchCurrentLayout(blockTableRecordId: string): void {
  acdbHostApplicationServices().layoutManager.setCurrentLayoutBtrId(
    blockTableRecordId
  )
}

/**
 * Builds submenu entries for every layout on the active document.
 *
 * @returns Menu items that switch the current layout when clicked.
 */
export function createLayoutToolbarChildren(): AcExToolbarItem[] {
  return listDocumentLayouts().map(layout => ({
    id: `layout-${layout.blockTableRecordId}`,
    label: layout.name,
    action: () => switchCurrentLayout(layout.blockTableRecordId),
    toggle: {
      getValue: () => {
        const database = AcApDocManager.instance.curDocument?.database
        return database?.currentSpaceId === layout.blockTableRecordId
      },
      on: {},
      off: {}
    }
  }))
}

/**
 * Creates the default layout-switcher toolbar button.
 *
 * Children are resolved from the active document each time they are read, so the
 * menu stays in sync when a drawing is opened or layouts change.
 *
 * @returns Layout parent button with a popover menu (`childrenUi: 'menu'`).
 */
export function createLayoutToolbarItem(): AcExToolbarItem {
  const item: AcExToolbarItem = {
    id: 'layout',
    label: 'toolbar.layout',
    icon: ICON_LAYOUT,
    requiresDocument: true,
    childrenUi: 'menu',
    children: []
  }
  return copyDynamicToolbarChildren(item, createLayoutToolbarChildren)
}
