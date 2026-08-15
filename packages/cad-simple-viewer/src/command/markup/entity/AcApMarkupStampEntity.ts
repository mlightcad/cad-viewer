import { AcTrHtmlStamp } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import type { AcApOverlayWorldDrawResult } from '../../overlay'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'
import { bindMarkupCenterMove } from './AcApMarkupEntityGrips'

/**
 * Stamp or symbol markup rendered as an {@link AcTrHtmlStamp}.
 *
 * Drag the stamp to move it.
 */
export class AcApMarkupStampEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type is `stamp` or `symbol`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Publish a stamp / symbol image overlay and bind drag-to-move.
   *
   * @param view - Active 2D view.
   * @returns Group with the stamp and dispose / grip binders.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'stamp' && geom.type !== 'symbol') {
      return this.emptyResult(this.createGroup())
    }
    const { color, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for center-move drag. */
    const cleanups: Array<() => void> = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    const stampId = geom.type === 'stamp' ? geom.stampId : geom.symbolId
    const stamp = new AcTrHtmlStamp({
      id: `${this.record.id}-stamp`,
      color,
      stampId,
      text: this.record.text,
      imageUrl: geom.imageUrl,
      worldPosition: geom.position,
      layer,
      layoutId
    })
    group.add(stamp)

    pendingGrips.push(() => {
      cleanups.push(
        bindMarkupCenterMove({
          view,
          recordId: this.record.id,
          centerEl: stamp
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
