import {
  AcDbAssocArrayPolarParameters,
  AcGePoint3d
} from '@mlightcad/data-model'

const TWO_PI = Math.PI * 2
const FULL_CIRCLE_EPS = 1e-9

/**
 * Builds polar-array parameters from UI values.
 *
 * @remarks `getAngle` returns **degrees**; associative parameters store
 * radians. Passing degrees straight into {@link AcDbAssocArrayPolarParameters}
 * produced the “90° fill spans most of the circle” bug (90 rad ≈ 5157°).
 */
export function acapBuildPolarArrayParameters(options: {
  itemCount: number
  /** Fill angle from {@link AcEdInputManager.getAngle} (degrees). */
  fillAngleDegrees: number
  rotateItems: boolean
  center: AcGePoint3d
  basePoint: AcGePoint3d
}): AcDbAssocArrayPolarParameters {
  // `fillAngle` setter clamps to 2π; normalize here so the spacing math below
  // agrees with the stored value (AutoCAD rejects > 360° as a full circle).
  const rawFill = (options.fillAngleDegrees * Math.PI) / 180
  const fillAngle = Math.min(TWO_PI, Math.abs(rawFill))
  const fullCircle = Math.abs(fillAngle - TWO_PI) < FULL_CIRCLE_EPS
  const itemCount = Math.max(1, Math.floor(options.itemCount))
  const angleBetween =
    itemCount > 1 ? fillAngle / (itemCount - (fullCircle ? 0 : 1)) : 0

  const params = new AcDbAssocArrayPolarParameters(
    angleBetween,
    0,
    1,
    itemCount,
    1,
    1,
    0
  )
  params.center = options.center
  params.basePoint = options.basePoint
  params.fillAngle = fillAngle
  params.rotateItems = options.rotateItems
  if (fullCircle) {
    params.angleBetweenItems = TWO_PI / itemCount
  }
  // `center` must be set first: this derives `radius` / `startAngle` so item 0
  // lands on the source base point. Without it every item collapses onto the
  // center and the live preview / commit draws nothing usable.
  params.setFirstItemPosition(options.basePoint)
  return params
}
