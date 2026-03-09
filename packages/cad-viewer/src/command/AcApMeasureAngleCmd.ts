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
 * Measurement command: click three points (vertex, arm1, arm2) to display the angle.
 */
export class AcApMeasureAngleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const overlay = AcApMeasureOverlay.instance
    overlay.init(context.view)

    const opt1 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.angle.vertex'))
    const p1 = await AcApDocManager.instance.editor.getPoint(opt1)
    const vertex = new AcGePoint3d(p1.x, p1.y, p1.z ?? 0)

    const opt2 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.angle.arm1'))
    opt2.useBasePoint = true
    opt2.basePoint = new AcGePoint3d(vertex.x, vertex.y, vertex.z)
    opt2.useDashedLine = true
    const p2 = await AcApDocManager.instance.editor.getPoint(opt2)
    const arm1 = new AcGePoint3d(p2.x, p2.y, p2.z ?? 0)

    // Draw the first arm immediately so the user sees it
    overlay.addSegment(context.view, vertex, arm1)
    overlay.addDot(context.view, vertex)
    overlay.addDot(context.view, arm1)

    const opt3 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.angle.arm2'))
    opt3.useBasePoint = true
    opt3.basePoint = new AcGePoint3d(vertex.x, vertex.y, vertex.z)
    opt3.useDashedLine = true
    const p3 = await AcApDocManager.instance.editor.getPoint(opt3)
    const arm2 = new AcGePoint3d(p3.x, p3.y, p3.z ?? 0)

    // Calculate angle between the two arms
    const dx1 = arm1.x - vertex.x
    const dy1 = arm1.y - vertex.y
    const dx2 = arm2.x - vertex.x
    const dy2 = arm2.y - vertex.y

    const angle1 = Math.atan2(dy1, dx1)
    const angle2 = Math.atan2(dy2, dx2)

    // Signed angle from arm1 to arm2 (counter-clockwise positive)
    let angleDiff = angle2 - angle1
    // Normalize to [0, 2π)
    if (angleDiff < 0) angleDiff += Math.PI * 2

    // Use the smaller angle (≤180°)
    const degrees = angleDiff <= Math.PI
      ? (angleDiff * 180) / Math.PI
      : ((Math.PI * 2 - angleDiff) * 180) / Math.PI

    const text = AcApI18n.t('main.measure.angle.result').replace('{value}', degrees.toFixed(2))

    overlay.addAngleLabel(context.view, vertex, arm1, arm2, text)
  }
}
