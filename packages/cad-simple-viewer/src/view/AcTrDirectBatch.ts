import { AcDbEntity, AcDbRay, AcDbXline } from '@mlightcad/data-model'
import {
  buildAreaGeometry,
  buildLineGeometry,
  buildLineSegmentsGeometry,
  buildPointGeometry,
  isDirectBatchRejectedMaterial,
  resolveAnchorFromBox,
  type AcTrDirectEntityMeta,
  type AcTrEntity,
  type AcTrRenderer
} from '@mlightcad/three-renderer'

// TODO(direct-batch-prof): remove A/B gate + stats before merge PR.
/** Runtime gate for A/B open profiling (`directbatch=0` disables). */
let directBatchEnabled = true

/**
 * Open-session counters for A/B convert timing of direct-batch candidates.
 *
 * OPENPROF `scene convert` is often near-zero because streaming
 * `entityAppended` converts during ENTITY flush; these counters measure the
 * actual batchConvert work for entities that declare
 * {@link AcDbEntity.directBatchPrimitive}.
 *
 * TODO(direct-batch-prof): remove before merge PR.
 */
export interface AcTrDirectBatchStats {
  enabled: boolean
  candidateCount: number
  hitCount: number
  hitMs: number
  missCount: number
  legacyCandidateMs: number
}

// TODO(direct-batch-prof): remove before merge PR.
const stats: AcTrDirectBatchStats = {
  enabled: true,
  candidateCount: 0,
  hitCount: 0,
  hitMs: 0,
  missCount: 0,
  legacyCandidateMs: 0
}

/**
 * Enables or disables the open-time direct-batch fast path.
 *
 * Used by example OPENPROF A/B harnesses; production defaults to enabled.
 *
 * TODO(direct-batch-prof): remove before merge PR (keep path always on).
 */
export function setDirectBatchEnabled(enabled: boolean) {
  directBatchEnabled = enabled
  stats.enabled = enabled
}

/** Returns whether the direct-batch fast path is currently enabled. */
// TODO(direct-batch-prof): remove before merge PR.
export function isDirectBatchEnabled() {
  return directBatchEnabled
}

/** Returns a copy of the current direct-batch convert counters. */
// TODO(direct-batch-prof): remove before merge PR.
export function getDirectBatchStats(): AcTrDirectBatchStats {
  return { ...stats }
}

/** Clears convert counters (call before each OPENPROF open). */
// TODO(direct-batch-prof): remove before merge PR.
export function resetDirectBatchStats() {
  stats.enabled = directBatchEnabled
  stats.candidateCount = 0
  stats.hitCount = 0
  stats.hitMs = 0
  stats.missCount = 0
  stats.legacyCandidateMs = 0
}

/** Records a successful direct-append convert for one candidate entity. */
// TODO(direct-batch-prof): remove before merge PR.
export function recordDirectBatchHit(durationMs: number) {
  stats.candidateCount++
  stats.hitCount++
  stats.hitMs += durationMs
}

/**
 * Records a candidate that fell through to the legacy convert path
 * (capture miss, patterned linetype, feature disabled, etc.).
 *
 * TODO(direct-batch-prof): remove before merge PR.
 */
export function recordDirectBatchLegacy(durationMs: number, missed: boolean) {
  stats.candidateCount++
  if (missed) {
    stats.missCount++
  }
  stats.legacyCandidateMs += durationMs
}

/**
 * Whether the entity advertises a single batchable draw primitive.
 * Prefer this over hard-coded `instanceof` lists.
 */
export function isDirectBatchCandidate(entity: AcDbEntity): boolean {
  return entity.directBatchPrimitive != null
}

/**
 * Builds a direct-batch payload by running the entity's normal
 * {@link AcDbEntity.worldDraw} path so tessellation stays in `subWorldDraw`.
 *
 * Returns `null` when the entity does not declare a direct primitive, capture
 * misses, materials are unbatchable, or large-coordinate policy forces unbatch.
 */
export function tryBuildDirectEntityMeta(
  entity: AcDbEntity,
  renderer: AcTrRenderer
): AcTrDirectEntityMeta | null {
  // TODO(direct-batch-prof): drop `!directBatchEnabled` once A/B gate is removed.
  if (!directBatchEnabled || entity.directBatchPrimitive == null) {
    return null
  }

  renderer.beginDirectCapture()
  let placeholder: AcTrEntity | undefined
  try {
    placeholder = entity.worldDraw(renderer) as AcTrEntity | undefined
    const payload = renderer.takeDirectCapture()
    if (!payload) {
      return null
    }

    const built = buildFromCapture(payload, renderer)
    if (!built || built.wcsBbox.isEmpty()) {
      return null
    }

    const drawMode = renderer.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(built.wcsBbox),
      position: built.position
    })
    if (drawMode === 'unbatch') {
      built.geometry.dispose()
      return null
    }

    return {
      ...built,
      objectId: entity.objectId,
      ownerId: entity.ownerId,
      layerName: entity.layer,
      visible: entity.visibility !== false
    }
  } catch (error) {
    renderer.cancelDirectCapture()
    throw error
  } finally {
    placeholder?.dispose()
  }
}

/** RAY / XLINE still use direct batch but must not extend layout extents. */
export function shouldExtendBboxForDirectEntity(entity: AcDbEntity): boolean {
  return !(entity instanceof AcDbRay || entity instanceof AcDbXline)
}

function buildFromCapture(
  payload: NonNullable<ReturnType<AcTrRenderer['takeDirectCapture']>>,
  renderer: AcTrRenderer
): Omit<
  AcTrDirectEntityMeta,
  'objectId' | 'ownerId' | 'layerName' | 'visible'
> | null {
  const traits = renderer.subEntityTraits

  if (payload.kind === 'lineStrip') {
    const material = renderer.styleManager.getLineMaterial(traits, false)
    if (isDirectBatchRejectedMaterial(material)) {
      return null
    }
    const line = buildLineGeometry(payload.points, material)
    if (!line) {
      return null
    }
    return {
      kind: line.kind === 'fat' ? 'lineFat' : 'lineBasic',
      geometry: line.geometry,
      worldOffset: line.worldOffset,
      wcsBbox: line.wcsBbox,
      material: line.material
    }
  }

  if (payload.kind === 'lineSegments') {
    const material = renderer.styleManager.getLineMaterial(traits, false)
    return buildLineSegmentsGeometry(
      payload.array,
      payload.itemSize,
      payload.indices,
      material
    )
  }

  if (payload.kind === 'point') {
    const material = renderer.styleManager.getPointsMaterial(traits)
    if (isDirectBatchRejectedMaterial(material)) {
      return null
    }
    return buildPointGeometry(payload.point, material)
  }

  if (payload.kind === 'area') {
    const built = buildAreaGeometry(payload.area, traits, renderer.context)
    if (!built) {
      return null
    }
    if (isDirectBatchRejectedMaterial(built.material)) {
      built.geometry.dispose()
      return null
    }
    return built
  }

  return null
}
