import { AcTrHtmlBadge } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view/index.js'
import type { AcApOverlayWorldDrawResult } from '../../overlay/index.js'
import { bindMarkupInlineTextEdit } from '../AcApMarkupTextEdit.js'
import type { AcApMarkupRecord } from '../AcApMarkupTypes.js'
import { AcApMarkupEntity } from './AcApMarkupEntity.js'
import { bindMarkupCenterMove } from './AcApMarkupEntityGrips.js'

/**
 * Text note markup rendered as an {@link AcTrHtmlBadge}.
 *
 * Drag the badge to move; double-click to edit text inline.
 */
export class AcApMarkupTextEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type must be `text`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Publish a badge at the text position, bind drag-to-move and inline edit.
   *
   * @param view - Active 2D view.
   * @returns Group with the badge and dispose / grip binders.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'text') {
      return this.emptyResult(this.createGroup())
    }
    const { color, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for inline text edit and center-move drag. */
    const cleanups: Array<() => void> = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    const badge = new AcTrHtmlBadge({
      id: `${this.record.id}-badge`,
      color,
      text: this.record.text || 'Note',
      fontSize: this.record.style.fontSize,
      worldPosition: geom.position,
      layer,
      layoutId
    })
    group.add(badge)
    this.seedOverlaySizes(view, [badge], [])
    cleanups.push(
      bindMarkupInlineTextEdit({
        view,
        el: badge.element,
        recordId: this.record.id
      })
    )

    pendingGrips.push(() => {
      cleanups.push(
        bindMarkupCenterMove({
          view,
          recordId: this.record.id,
          centerEl: badge
        })
      )
    })

    return {
      group,
      entityIds: [],
      dispose: () => {
        for (const fn of cleanups) {
          try {
            fn()
          } catch {
            // ignore
          }
        }
      },
      bindGrips: () => {
        for (const bind of pendingGrips) bind()
      }
    }
  }
}
