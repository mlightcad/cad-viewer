import {
  AcGeEllipseArc3d,
  AcGeMathUtil,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'

export class AcTrEllipticalArc extends AcSvgEntity {
  constructor(ellipseArc: AcGeEllipseArc3d) {
    super()
    if (ellipseArc.closed) {
      // TODO: Considering rotation
      this.svg = `\n<ellipse cx="${ellipseArc.center.x}" cy="${ellipseArc.center.y}" rx="${ellipseArc.majorAxisRadius}" ry="${ellipseArc.minorAxisRadius}"/>`
    } else {
      const start = ellipseArc.startPoint
      const end = ellipseArc.endPoint

      // Calculate sweepFlag
      const xAxisRotation = AcGeMathUtil.radToDeg(
        ellipseArc.majorAxis.angleTo(AcGeVector3d.X_AXIS)
      )
      const sweepFlag = ellipseArc.clockwise ? 0 : 1
      this.svg = `\n<path d="M${start.x},${start.y} A${ellipseArc.majorAxisRadius},${ellipseArc.minorAxisRadius} ${xAxisRotation} ${ellipseArc.isLargeArc},${sweepFlag} ${end.x},${end.y}"/>`
    }
    const box = ellipseArc.box
    this._box.min.copy(box.min)
    this._box.max.copy(box.max)
  }
}
