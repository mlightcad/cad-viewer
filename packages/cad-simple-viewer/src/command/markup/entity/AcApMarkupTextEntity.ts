import { AcTrHtmlBadge } from '@mlightcad/three-renderer'

import type { AcApOverlayWorldDrawResult } from '../../overlay'
import type { AcTrView2d } from '../../../view'
import { bindMarkupInlineTextEdit } from '../AcApMarkupTextEdit'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'

/**
 * Text note markup rendered as an {@link AcTrHtmlBadge}.
 */
export class AcApMarkupTextEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type must be `text`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Text notes have no move grip in the presenter UX (inline edit only).
   *
   * @returns Empty grip list.
   */
  override subGetGripPoints() {
    return []
  }

  /**
   * Publish a badge at the text position and bind inline edit.
   *
   * @param view - Active 2D view.
   * @returns Group with the badge and dispose for the edit binder.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'text') {
      return this.emptyResult(this.createGroup())
    }
    const { color, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for inline text edit and other listeners. */
    const cleanups: Array<() => void> = []

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
    cleanups.push(
      bindMarkupInlineTextEdit({
        view,
        el: badge.element,
        recordId: this.record.id
      })
    )

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
      }
    }
  }
}
