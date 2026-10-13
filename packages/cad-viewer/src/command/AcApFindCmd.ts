import { AcApContext, AcEdCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * Opens the Find palette (FIND).
 *
 * The palette searches text, multiline text, attributes and the text inside
 * blocks, dimensions, leaders and tables in the whole drawing (all layouts) by
 * default, or in the current layout only, and navigates to a result
 * (activating its layout when needed).
 */
export class AcApFindCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    openFindPalette()
  }
}

/**
 * Shows the Find tab of the palette and focuses its query field. Shared by
 * the FIND command, the ribbon button and the Ctrl/Cmd+F shortcut.
 */
export function openFindPalette() {
  store.dialogs.activePaletteTab = 'find'
  store.dialogs.layerManager = true
  store.dialogs.findFocusTick++
}

/**
 * True when a keydown is the Find shortcut (Ctrl+F, or Cmd+F on macOS)
 * that the viewer should handle instead of the browser's page search, which
 * cannot see text drawn on the canvas.
 */
export function isFindShortcut(
  e: Pick<
    KeyboardEvent,
    'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
  >
): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false
  return e.code === 'KeyF' || e.key === 'f' || e.key === 'F'
}

/**
 * True when the keydown target counts as "inside the viewer" for the Find
 * shortcut: nothing focused (`null`), the page body / root element (focus is
 * on the page, not on a field) or a node inside the viewer root. A field
 * outside the viewer keeps the browser's own Ctrl/Cmd+F.
 */
export function isFindShortcutInViewer(
  target: EventTarget | null,
  viewerRoot: { contains(node: Node): boolean } | null | undefined
): boolean {
  if (!target) return true
  if (target === document.body || target === document.documentElement) {
    return true
  }
  return !!viewerRoot?.contains(target as Node)
}
