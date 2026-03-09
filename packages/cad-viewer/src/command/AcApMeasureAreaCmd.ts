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
 * Measurement command: click multiple points (double-click to finish) to display area.
 */
export class AcApMeasureAreaCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const overlay = AcApMeasureOverlay.instance
    overlay.init(context.view)

    const points: AcGePoint3d[] = []

    const opt1 = new AcEdPromptPointOptions(AcApI18n.t('main.measure.area.firstPoint'))
    const p1 = await AcApDocManager.instance.editor.getPoint(opt1)
    const first = new AcGePoint3d(p1.x, p1.y, p1.z ?? 0)
    points.push(first)
    overlay.addDot(context.view, first)

    while (true) {
      const opt = new AcEdPromptPointOptions(
        AcApI18n.t('main.measure.area.nextPoint').replace('{count}', String(points.length))
      )
      opt.useBasePoint = true
      const last = points[points.length - 1]
      opt.basePoint = new AcGePoint3d(last.x, last.y, last.z ?? 0)
      opt.useDashedLine = true
      opt.allowNone = true

      try {
        const next = await AcApDocManager.instance.editor.getPoint(opt)
        if (next == null) break
        const nextPt = new AcGePoint3d(next.x, next.y, next.z ?? 0)
        overlay.addSegment(context.view, last, nextPt)
        points.push(nextPt)
      } catch {
        break
      }
    }

    if (points.length < 3) return

    const area = Math.abs(this._shoelace(points))
    const text = AcApI18n.t('main.measure.area.result').replace('{value}', area.toFixed(4))
    overlay.addAreaLabel(context.view, points, text)
  }

  private _shoelace(pts: { x: number; y: number }[]): number {
    let sum = 0
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y
    }
    return sum / 2
  }
}
