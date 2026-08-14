import type {
  AcApMarkupAttachedCallout,
  AcApMarkupGeometry,
  AcApMarkupPoint2d
} from './AcApMarkupTypes'

/**
 * Translate a 2D markup point by a world-space delta.
 *
 * @param point - Original point.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new point; `point` is not mutated.
 */
export function translateMarkupPoint(
  point: AcApMarkupPoint2d,
  dx: number,
  dy: number
): AcApMarkupPoint2d {
  return { x: point.x + dx, y: point.y + dy }
}

/**
 * Translate an attached shape callout by a world-space delta.
 *
 * @param callout - Callout whose tip and anchor are moved.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new callout; text is copied unchanged.
 */
export function translateAttachedCallout(
  callout: AcApMarkupAttachedCallout,
  dx: number,
  dy: number
): AcApMarkupAttachedCallout {
  return {
    tip: translateMarkupPoint(callout.tip, dx, dy),
    anchor: translateMarkupPoint(callout.anchor, dx, dy),
    text: callout.text
  }
}

/**
 * Center point used as the move grip for a markup.
 *
 * @param geometry - Markup geometry to inspect.
 * @returns Midpoint, center, or position, or `undefined` for unknown types.
 */
export function markupGeometryCenter(
  geometry: AcApMarkupGeometry
): AcApMarkupPoint2d | undefined {
  switch (geometry.type) {
    case 'cloud':
    case 'rect':
    case 'highlight':
      return {
        x: (geometry.corner1.x + geometry.corner2.x) / 2,
        y: (geometry.corner1.y + geometry.corner2.y) / 2
      }
    case 'circle':
      return { ...geometry.center }
    case 'callout':
      return {
        x: (geometry.tip.x + geometry.anchor.x) / 2,
        y: (geometry.tip.y + geometry.anchor.y) / 2
      }
    case 'arrow':
    case 'line':
      return {
        x: (geometry.start.x + geometry.end.x) / 2,
        y: (geometry.start.y + geometry.end.y) / 2
      }
    case 'text':
    case 'stamp':
    case 'symbol':
      return { ...geometry.position }
    default:
      return undefined
  }
}

/**
 * Translate a markup's geometry by a world-space delta.
 *
 * Radius and stamp ids are preserved; only positions move.
 *
 * @param geometry - Geometry to translate.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new geometry object of the same type.
 */
export function translateMarkupGeometry(
  geometry: AcApMarkupGeometry,
  dx: number,
  dy: number
): AcApMarkupGeometry {
  switch (geometry.type) {
    case 'cloud':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'rect':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'highlight':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy)
      }
    case 'circle':
      return {
        ...geometry,
        center: translateMarkupPoint(geometry.center, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'callout':
      return {
        ...geometry,
        tip: translateMarkupPoint(geometry.tip, dx, dy),
        anchor: translateMarkupPoint(geometry.anchor, dx, dy)
      }
    case 'arrow':
    case 'line':
      return {
        ...geometry,
        start: translateMarkupPoint(geometry.start, dx, dy),
        end: translateMarkupPoint(geometry.end, dx, dy)
      }
    case 'text':
    case 'stamp':
    case 'symbol':
      return {
        ...geometry,
        position: translateMarkupPoint(geometry.position, dx, dy)
      }
  }
}
