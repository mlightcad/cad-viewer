import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import type { AcTrView2d } from '../../view'
import { MARKUP_LAYER, MARKUP_LIVE_LAYER } from './AcApMarkupStore'

/** Session visibility for the markup HTML / canvas layer. */
let markupVisible = true

/** Whether markup overlays are currently shown. */
export function isMarkupVisible(): boolean {
  return markupVisible
}

/**
 * Show or hide all Design Review markup overlays (committed + live layers).
 */
export function setMarkupVisible(view: AcTrView2d, visible: boolean): void {
  markupVisible = visible
  view.htmlTransientManager.setVisible(visible, MARKUP_LAYER)
  view.htmlTransientManager.setVisible(visible, MARKUP_LIVE_LAYER)
  view.isDirty = true
}

/**
 * Toggle Design Review markup overlay visibility.
 */
export class AcApMarkupVisibilityCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    setMarkupVisible(view, !markupVisible)
  }
}
