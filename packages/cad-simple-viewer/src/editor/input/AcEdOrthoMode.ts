import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint2dLike
} from '@mlightcad/data-model'

/**
 * Returns whether orthogonal cursor locking is enabled for the given database.
 */
export function isOrthoModeEnabled(database?: AcDbDatabase): boolean {
  const db = database ?? acdbHostApplicationServices().workingDatabase
  const raw = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.ORTHOMODE,
    db
  )
  return Number(raw) !== 0
}

/**
 * Constrains a point to horizontal or vertical movement relative to a reference
 * point, matching AutoCAD ORTHOMODE behavior.
 */
export function constrainToOrtho(
  point: AcGePoint2dLike,
  reference: AcGePoint2dLike
): AcGePoint2dLike {
  const dx = point.x - reference.x
  const dy = point.y - reference.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: reference.y }
  }

  return { x: reference.x, y: point.y }
}
