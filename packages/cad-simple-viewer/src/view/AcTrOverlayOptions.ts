import type { AcGePoint3dLike } from '@mlightcad/data-model'

/** A similarity transform from a reference drawing's WCS to its host WCS. */
export interface AcTrOverlayTransform {
  position: AcGePoint3dLike
  scale: number
  rotationRad: number
}

/** Options used while preparing detached, read-only reference geometry. */
export interface AcTrOverlayOptions {
  signal?: AbortSignal
  transform?: AcTrOverlayTransform
}

/** Copies and validates placement before any asynchronous work or allocation. */
export function acTrSnapshotOverlayTransform(
  transform?: AcTrOverlayTransform
): AcTrOverlayTransform | undefined {
  if (!transform) return undefined
  const { x, y } = transform.position
  const z = transform.position.z ?? 0
  const { scale, rotationRad } = transform
  if (![x, y, z, scale, rotationRad].every(Number.isFinite) || scale <= 0) {
    throw new Error(
      'Overlay placement requires finite values and positive scale'
    )
  }
  return { position: { x, y, z }, scale, rotationRad }
}

/** Standard abort failure shared by the preparation and publication boundaries. */
export function acTrCheckOverlaySignal(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Overlay attachment was cancelled', 'AbortError')
  }
}
