import { AcGePoint3d } from '@mlightcad/data-model'
import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions
} from '@mlightcad/cad-simple-viewer'

import { AcApMeasureOverlay } from './AcApMeasureOverlay'

/**
 * Measurement command: click two points to display the distance.
 */
export class AcApMeasureDistCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const overlay = AcApMeasureOverlay.instance
    overlay.init(context.view)

    const opt1 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.dist.firstPoint'))
    const p1 = await AcApDocManager.instance.editor.getPoint(opt1)

    const opt2 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.dist.secondPoint'))
    opt2.useBasePoint = true
    opt2.basePoint = new AcGePoint3d(p1.x, p1.y, p1.z ?? 0)
    opt2.useDashedLine = true
    const p2 = await AcApDocManager.instance.editor.getPoint(opt2)

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const text = AcApI18n.t('main.measure.dist.result').replace('{value}', dist.toFixed(4))

    overlay.addDistanceLabel(context.view, p1, p2, text)
  }
}
