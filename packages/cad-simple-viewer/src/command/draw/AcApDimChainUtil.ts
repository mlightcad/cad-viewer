import {
  AcDb3PointAngularDimension,
  AcDbAlignedDimension,
  AcDbDatabase,
  AcDbDimension,
  AcDbRotatedDimension,
  AcGePoint3d,
  AcGePoint3dLike,
  acdbDimFeatureScale
} from '@mlightcad/data-model'

import { AcApDocManager } from '../../app'
import { AcEdPromptEntityOptions, AcEdPromptStatus } from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  getChainBaseId,
  getChainCursorId,
  selectChainDimension
} from './AcApDimCmdUtil'

export type ChainKind = 'continue' | 'baseline'

export function isChainDimension(
  entity: unknown
): entity is AcDbAlignedDimension | AcDb3PointAngularDimension {
  return (
    entity instanceof AcDbAlignedDimension ||
    entity instanceof AcDb3PointAngularDimension
  )
}

export function resolveChainDimension(
  db: AcDbDatabase,
  kind: ChainKind
): AcDbAlignedDimension | AcDb3PointAngularDimension | null {
  const id = kind === 'continue' ? getChainCursorId() : getChainBaseId()
  if (!id) return null
  const entity = db.tables.blockTable.getEntityById(id)
  return isChainDimension(entity) ? entity : null
}

export async function promptSelectChainDimension(
  i18nPrefix: string
): Promise<AcDbAlignedDimension | AcDb3PointAngularDimension | null> {
  const editor = AcApDocManager.instance.editor
  const db = AcApDocManager.instance.curDocument.database
  const prompt = new AcEdPromptEntityOptions(
    AcApI18n.t(`${i18nPrefix}.selectDimension`)
  )
  prompt.addAllowedClass('RotatedDimension')
  prompt.addAllowedClass('AlignedDimension')
  prompt.addAllowedClass('3PointAngularDimension')
  prompt.setRejectMessage(AcApI18n.t(`${i18nPrefix}.rejectObject`))
  const picked = await editor.getEntity(prompt)
  if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return null
  const entity = db.tables.blockTable.getEntityById(picked.objectId)
  if (!isChainDimension(entity)) return null
  selectChainDimension(entity.objectId)
  return entity
}

function dimScaleOf(dim: AcDbDimension) {
  return acdbDimFeatureScale(dim.dimensionStyle)
}

/** Offset the dimension line further to the same side as the source dim. */
export function baselineDimLinePoint(
  source: AcDbAlignedDimension,
  step: number
): AcGePoint3d {
  const spacing = source.dimensionStyle.dimdli * dimScaleOf(source)
  const rotation = source.rotation
  const nx = -Math.sin(rotation)
  const ny = Math.cos(rotation)
  const midX = (source.xLine1Point.x + source.xLine2Point.x) / 2
  const midY = (source.xLine1Point.y + source.xLine2Point.y) / 2
  const side =
    (source.dimLinePoint.x - midX) * nx + (source.dimLinePoint.y - midY) * ny >=
    0
      ? 1
      : -1
  const distance = spacing * Math.max(1, step)
  return new AcGePoint3d(
    source.dimLinePoint.x + nx * side * distance,
    source.dimLinePoint.y + ny * side * distance,
    source.dimLinePoint.z
  )
}

/** Offset the angular arc point radially from the center by DIMDLI * step. */
export function baselineArcPoint(
  source: AcDb3PointAngularDimension,
  step: number
): AcGePoint3d {
  const spacing = source.dimensionStyle.dimdli * dimScaleOf(source)
  const cx = source.centerPoint.x
  const cy = source.centerPoint.y
  const ax = source.arcPoint.x - cx
  const ay = source.arcPoint.y - cy
  const radius = Math.hypot(ax, ay)
  if (radius < 1e-12) {
    return source.arcPoint.clone()
  }
  const distance = spacing * Math.max(1, step)
  const scale = (radius + distance) / radius
  return new AcGePoint3d(
    cx + ax * scale,
    cy + ay * scale,
    source.arcPoint.z
  )
}

/** Continue/baseline dims inherit the base dimension's style (AutoCAD behavior). */
export function applySourceDimStyle(
  dim: AcDbDimension,
  source: AcDbDimension
) {
  dim.dimensionStyleName = source.dimensionStyleName
}

export function createContinuedDimension(
  source: AcDbAlignedDimension | AcDb3PointAngularDimension,
  nextPoint: AcGePoint3dLike,
  mode: ChainKind,
  step: number
): AcDbDimension {
  if (source instanceof AcDb3PointAngularDimension) {
    const arcPoint =
      mode === 'baseline' && step > 0
        ? baselineArcPoint(source, step)
        : source.arcPoint.clone()
    const dim = new AcDb3PointAngularDimension(
      source.centerPoint.clone(),
      mode === 'baseline'
        ? source.xLine1Point.clone()
        : source.xLine2Point.clone(),
      nextPoint,
      arcPoint
    )
    return dim
  }

  const x1 =
    mode === 'baseline'
      ? source.xLine1Point.clone()
      : source.xLine2Point.clone()
  const dimLine =
    mode === 'baseline' && step > 0
      ? baselineDimLinePoint(source, step)
      : source.dimLinePoint.clone()

  if (source instanceof AcDbRotatedDimension) {
    const dim = new AcDbRotatedDimension(x1, nextPoint, dimLine)
    dim.rotation = source.rotation
    return dim
  }
  return new AcDbAlignedDimension(x1, nextPoint, dimLine)
}
