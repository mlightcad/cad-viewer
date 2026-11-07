import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcApUcsService } from '../../service/AcApUcsService'

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
 * point in the current UCS, matching AutoCAD ORTHOMODE behavior.
 */
export function constrainToOrtho(
  point: AcGePoint2dLike,
  reference: AcGePoint2dLike,
  database?: AcDbDatabase
): AcGePoint2dLike {
  const frame = AcApUcsService.getActiveFrame(database)
  if (AcApUcsService.isWorldFrame(frame)) {
    const dx = point.x - reference.x
    const dy = point.y - reference.y
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { x: point.x, y: reference.y }
    }
    return { x: reference.x, y: point.y }
  }

  const pU = AcApUcsService.wcsToUcs(
    { x: point.x, y: point.y, z: 0 },
    frame,
    database
  )
  const rU = AcApUcsService.wcsToUcs(
    { x: reference.x, y: reference.y, z: 0 },
    frame,
    database
  )
  const dx = pU.x - rU.x
  const dy = pU.y - rU.y
  const constrainedU =
    Math.abs(dx) >= Math.abs(dy)
      ? { x: pU.x, y: rU.y, z: 0 }
      : { x: rU.x, y: pU.y, z: 0 }
  const wcs = AcApUcsService.ucsToWcs(constrainedU, frame, database)
  return { x: wcs.x, y: wcs.y }
}
