import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcEdBaseView,
  AcEdPreviewJig
} from '@mlightcad/cad-simple-viewer'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { AcDbLine, type AcGePoint2dLike } from '@mlightcad/data-model'

import { promptAnnotationText } from '../util/promptText'
import { AcApAnnotationCmd } from './AcApAnnotationCmd'

class LeaderJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _line: AcDbLine
  constructor(view: AcEdBaseView, anchor: AcGePoint2dLike) {
    super(view)
    this._line = new AcDbLine(
      { x: anchor.x, y: anchor.y, z: 0 },
      { x: anchor.x, y: anchor.y, z: 0 }
    )
  }
  get entity() {
    return this._line
  }
  update(p: AcGePoint2dLike) {
    this._line.endPoint = { x: p.x, y: p.y, z: 0 }
  }
}

export class AcApAnLeaderCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const anchor = await this.getPoint(
      AcApI18n.t('annotation.jig.leader.anchor')
    )
    if (!anchor) return
    const textPoint = await this.getPoint(
      AcApI18n.t('annotation.jig.leader.textPoint'),
      new LeaderJig(context.view, anchor)
    )
    if (!textPoint) return
    const text = await promptAnnotationText(
      AcApI18n.t('annotation.jig.leader.text')
    )
    if (!text) return
    this.commitRecord(context, {
      type: 'leader',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: {
        anchor: { x: anchor.x, y: anchor.y },
        textPoint: { x: textPoint.x, y: textPoint.y },
        text
      },
      content: { text },
      style: { ...this.style }
    })
  }
}

export class AcApAnTextCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const anchor = await this.getPoint(AcApI18n.t('annotation.jig.text.point'))
    if (!anchor) return
    const text = await promptAnnotationText(
      AcApI18n.t('annotation.jig.text.content')
    )
    if (!text) return
    this.commitRecord(context, {
      type: 'text',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { anchor: { x: anchor.x, y: anchor.y } },
      content: { text },
      style: { ...this.style }
    })
  }
}