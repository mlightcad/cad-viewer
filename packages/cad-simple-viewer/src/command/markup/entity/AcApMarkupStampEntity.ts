import { AcTrHtmlStamp } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import type { AcApOverlayWorldDrawResult } from '../../overlay'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'

/**
 * Stamp or symbol markup rendered as an {@link AcTrHtmlStamp}.
 */
export class AcApMarkupStampEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type is `stamp` or `symbol`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Stamps currently have no move grips in the presenter UX.
   *
   * @returns Empty grip list.
   */
  override subGetGripPoints() {
    return []
  }

  /**
   * Publish a stamp / symbol image overlay at the record position.
   *
   * @param _view - Active 2D view (unused; stamp needs no view listeners).
   * @returns Group containing the stamp leaf.
   */
  protected subWorldDraw(_view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'stamp' && geom.type !== 'symbol') {
      return this.emptyResult(this.createGroup())
    }
    const { color, layer, layoutId } = this.style()
    const group = this.createGroup()
    const stampId = geom.type === 'stamp' ? geom.stampId : geom.symbolId
    group.add(
      new AcTrHtmlStamp({
        id: `${this.record.id}-stamp`,
        color,
        stampId,
        text: this.record.text,
        imageUrl: geom.imageUrl,
        worldPosition: geom.position,
        layer,
        layoutId
      })
    )
    return this.emptyResult(group)
  }
}
