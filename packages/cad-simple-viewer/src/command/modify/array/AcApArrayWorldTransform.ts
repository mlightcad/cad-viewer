import {
  AcDbAssocArrayItemLocator,
  AcDbAssocArrayParameters,
  AcGeMatrix3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

/**
 * World-space matrix for one array item when sources still live in WCS.
 *
 * {@link AcDbAssocArrayParameters.getItemTransform} maps the *source block*
 * into the *array block*. Live preview and commit operate on world-space
 * source entities, so the matrix must be wrapped as
 * `insertTransform · M · sourceToArrayBlock⁻¹`, mirroring
 * {@link AcDbAssocArrayActionBody.createInstance}:
 *
 * - Rectangular: the array INSERT sits at `basePoint` and the source block is
 *   authored at `T(-base)`, so the wrap is `T(base) · M · T(-base)`.
 * - Polar: the INSERT sits at the origin, so it is `M · T(-base)`.
 * - Path: the INSERT sits at the origin; when items align, the source block is
 *   authored in item 0's tangent frame, so `M · R(-θ₀) · T(-base)`.
 *
 * Using `T(base) · M · T(-base)` for every type made polar / path rotations
 * orbit the WCS origin instead of the array center.
 */
export function acapArrayWorldItemTransform(
  parameters: AcDbAssocArrayParameters,
  locator: AcDbAssocArrayItemLocator,
  basePoint: AcGePoint3dLike
): AcGeMatrix3d {
  const bx = basePoint.x
  const by = basePoint.y
  const bz = basePoint.z ?? 0
  const item = parameters.getItemTransform(locator)
  const world = AcGeMatrix3d.makeTranslation(-bx, -by, -bz)
  if (parameters.parameterType === 'path') {
    // Item 0's frame reduces to a pure rotation once its translation is
    // ignored; undoing it maps the WCS sources into the authored block.
    const first = parameters.getItemTransform(
      new AcDbAssocArrayItemLocator(0, 0, 0)
    )
    const angle = Math.atan2(first.elements[1], first.elements[0])
    if (Number.isFinite(angle) && Math.abs(angle) > 1e-12) {
      world.premultiply(new AcGeMatrix3d().makeRotationZ(-angle))
    }
  }
  world.premultiply(item)
  if (parameters.parameterType === 'rectangular') {
    world.premultiply(AcGeMatrix3d.makeTranslation(bx, by, bz))
  }
  return world
}

/**
 * True when `matrix` is approximately the 3D identity (no move / rotate / scale).
 *
 * Path arrays with a base away from path-start or with align-items can make
 * item (0,0,0) non-identity; preview/commit must not treat it as "keep sources".
 */
export function acapArrayMatrixIsIdentity(
  matrix: AcGeMatrix3d,
  tol = 1e-9
): boolean {
  const e = matrix.elements
  return (
    Math.abs(e[0] - 1) <= tol &&
    Math.abs(e[1]) <= tol &&
    Math.abs(e[2]) <= tol &&
    Math.abs(e[4]) <= tol &&
    Math.abs(e[5] - 1) <= tol &&
    Math.abs(e[6]) <= tol &&
    Math.abs(e[8]) <= tol &&
    Math.abs(e[9]) <= tol &&
    Math.abs(e[10] - 1) <= tol &&
    Math.abs(e[12]) <= tol &&
    Math.abs(e[13]) <= tol &&
    Math.abs(e[14]) <= tol
  )
}

/**
 * True when the first array item's world transform leaves WCS sources in place.
 */
export function acapArrayFirstItemIsIdentity(
  parameters: AcDbAssocArrayParameters,
  basePoint: AcGePoint3dLike
): boolean {
  const locator = new AcDbAssocArrayItemLocator(0, 0, 0)
  return acapArrayMatrixIsIdentity(
    acapArrayWorldItemTransform(parameters, locator, basePoint)
  )
}
