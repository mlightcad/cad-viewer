import {
  AcDbArc,
  AcDbCircle,
  AcDbCurve,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleResult,
  AcEdPromptEntityOptions,
  AcEdPromptEntityResult,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

const OFFSETTABLE_TYPES = [
  'Line',
  'Arc',
  'Circle',
  'Polyline',
  'Ellipse',
  'Spline'
]

function isOffsettableCurve(
  entity: AcDbEntity | undefined
): entity is AcDbCurve {
  return entity instanceof AcDbCurve
}

function copyEntityTraits(source: AcDbEntity, target: AcDbEntity) {
  target.layer = source.layer
  target.color = source.color.clone()
  target.lineType = source.lineType
  target.lineWeight = source.lineWeight
  target.linetypeScale = source.linetypeScale
  target.transparency = source.transparency
  target.visibility = source.visibility
}

function buildOffsetCurves(
  curve: AcDbCurve,
  distance: number,
  sidePoint: AcGePoint3dLike,
  layer: string
): AcDbCurve[] {
  try {
    const side = curve.getOffsetSideAtPoint(sidePoint)
    const offsetCurves = curve.getOffsetCurves(distance * side)
    offsetCurves.forEach(offsetCurve => {
      copyEntityTraits(curve, offsetCurve)
      offsetCurve.layer = layer
    })
    return offsetCurves
  } catch {
    return []
  }
}

function computeThroughDistance(
  entity: AcDbEntity,
  p: AcGePoint3dLike
): number {
  if (entity instanceof AcDbLine) {
    const s = entity.startPoint
    const e = entity.endPoint
    const dx = e.x - s.x
    const dy = e.y - s.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return 0
    return Math.abs((dy * p.x - dx * p.y + e.x * s.y - e.y * s.x) / len)
  }
  if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
    const c = (entity as AcDbCircle).center
    const r = (entity as AcDbCircle).radius
    return Math.abs(Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2) - r)
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    return Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let minDist = Infinity
    const segCount = entity.closed ? n : n - 1
    for (let i = 0; i < segCount; i++) {
      const a = entity.getPoint2dAt(i)
      const b = entity.getPoint2dAt((i + 1) % n)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)
      )
      const d = Math.sqrt((p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2)
      if (d < minDist) minDist = d
    }
    return minDist === Infinity ? 0 : minDist
  }
  return 0
}

function resolveThroughPoint(
  entity: AcDbEntity,
  distance: number,
  reference: AcGePoint3dLike
): AcGePoint3dLike | null {
  if (distance <= 0) return null
  if (!isOffsettableCurve(entity)) return null
  const side = entity.getOffsetSideAtPoint(reference)

  if (entity instanceof AcDbLine) {
    const s = entity.startPoint
    const e = entity.endPoint
    const dx = e.x - s.x
    const dy = e.y - s.y
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return null
    const len = Math.sqrt(len2)
    const t = ((reference.x - s.x) * dx + (reference.y - s.y) * dy) / len2
    const baseX = s.x + dx * t
    const baseY = s.y + dy * t
    return {
      x: baseX + (-dy / len) * distance * side,
      y: baseY + (dx / len) * distance * side,
      z: reference.z ?? 0
    }
  }

  if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
    const c = (entity as AcDbCircle).center
    const r = (entity as AcDbCircle).radius + distance * side
    if (r <= 0) return null
    const dx = reference.x - c.x
    const dy = reference.y - c.y
    const len = Math.hypot(dx, dy) || 1
    return {
      x: c.x + (dx / len) * r,
      y: c.y + (dy / len) * r,
      z: reference.z ?? 0
    }
  }

  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    const dx = reference.x - c.x
    const dy = reference.y - c.y
    const len = Math.hypot(dx, dy) || 1
    return {
      x: c.x + (dx / len) * distance,
      y: c.y + (dy / len) * distance,
      z: reference.z ?? 0
    }
  }

  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let bestDist = Infinity
    let bestPoint: { x: number; y: number } | null = null
    let bestNormal: { x: number; y: number } | null = null
    const segCount = entity.closed ? n : n - 1
    for (let i = 0; i < segCount; i++) {
      const a = entity.getPoint2dAt(i)
      const b = entity.getPoint2dAt((i + 1) % n)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(
        0,
        Math.min(
          1,
          ((reference.x - a.x) * dx + (reference.y - a.y) * dy) / len2
        )
      )
      const baseX = a.x + dx * t
      const baseY = a.y + dy * t
      const dist = (reference.x - baseX) ** 2 + (reference.y - baseY) ** 2
      if (dist < bestDist) {
        const len = Math.sqrt(len2)
        bestDist = dist
        bestPoint = { x: baseX, y: baseY }
        bestNormal = { x: -dy / len, y: dx / len }
      }
    }
    if (!bestPoint || !bestNormal) return null
    return {
      x: bestPoint.x + bestNormal.x * distance * side,
      y: bestPoint.y + bestNormal.y * distance * side,
      z: reference.z ?? 0
    }
  }

  return null
}

class AcApOffsetPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _source: AcDbCurve
  private _distance: number | ((point: AcGePoint3dLike) => number)
  private _layer: string
  private _previewCurves: AcDbCurve[] = []
  private _renderedIds: string[] = []

  constructor(
    view: AcEdBaseView,
    source: AcDbCurve,
    distance: number | ((point: AcGePoint3dLike) => number),
    layer: string
  ) {
    super(view)
    this._view = view
    this._source = source
    this._distance = distance
    this._layer = layer
  }

  get entity(): AcDbEntity | null {
    return this._previewCurves[0] ?? null
  }

  update(point: AcGePoint3dLike): void {
    this.clearRendered()
    const distance =
      typeof this._distance === 'function'
        ? this._distance(point)
        : this._distance
    this._previewCurves =
      distance > 0
        ? buildOffsetCurves(this._source, distance, point, this._layer)
        : []
  }

  override render(): void {
    if (this._previewCurves.length === 0) return
    this._view.addTransientEntity(this._previewCurves)
    this._renderedIds = this._previewCurves.map(entity => entity.objectId)
  }

  override end(): void {
    this.clearRendered()
  }

  private clearRendered(): void {
    this._renderedIds.forEach(id => this._view.removeTransientEntity(id))
    this._renderedIds = []
  }
}

export class AcApOffsetCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext): Promise<void> {
    const db = context.doc.database
    const blockTable = db.tables.blockTable
    let distance: number | undefined
    let throughMode = false
    let eraseSource = false
    let layerMode: 'source' | 'current' = 'source'

    while (distance === undefined && !throughMode) {
      const distPrompt = new AcEdPromptDistanceOptions(
        AcApI18n.t('jig.offset.distanceOrOptions')
      )
      distPrompt.useBasePoint = false
      distPrompt.keywords.add(
        AcApI18n.t('jig.offset.keywords.through.display'),
        AcApI18n.t('jig.offset.keywords.through.global'),
        AcApI18n.t('jig.offset.keywords.through.local')
      )
      distPrompt.keywords.add(
        AcApI18n.t('jig.offset.keywords.erase.display'),
        AcApI18n.t('jig.offset.keywords.erase.global'),
        AcApI18n.t('jig.offset.keywords.erase.local')
      )
      distPrompt.keywords.add(
        AcApI18n.t('jig.offset.keywords.layer.display'),
        AcApI18n.t('jig.offset.keywords.layer.global'),
        AcApI18n.t('jig.offset.keywords.layer.local')
      )
      const distResult: AcEdPromptDoubleResult =
        await AcApDocManager.instance.editor.getDistance(distPrompt)
      if (distResult.status === AcEdPromptStatus.OK) {
        if (distResult.value! <= 0) {
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t('jig.offset.invalidDistance')
          )
          continue
        }
        distance = distResult.value!
      } else if (distResult.status === AcEdPromptStatus.Keyword) {
        const kw = distResult.stringResult ?? ''
        if (kw === 'Through') {
          throughMode = true
          break
        }
        if (kw === 'Erase') {
          eraseSource = !eraseSource
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t(
              eraseSource ? 'jig.offset.eraseOn' : 'jig.offset.eraseOff'
            )
          )
          continue
        }
        if (kw === 'Layer') {
          layerMode = layerMode === 'source' ? 'current' : 'source'
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t(
              layerMode === 'source'
                ? 'jig.offset.layerSource'
                : 'jig.offset.layerCurrent'
            )
          )
          continue
        }
        return
      } else {
        return
      }
    }

    while (true) {
      const entityPrompt = new AcEdPromptEntityOptions(
        AcApI18n.t('jig.offset.selectObject')
      )
      entityPrompt.allowNone = true
      entityPrompt.setRejectMessage(AcApI18n.t('jig.offset.cannotOffset'))
      OFFSETTABLE_TYPES.forEach(t => entityPrompt.addAllowedClass(t))
      const entityResult: AcEdPromptEntityResult =
        await AcApDocManager.instance.editor.getEntity(entityPrompt)
      if (entityResult.status !== AcEdPromptStatus.OK || !entityResult.objectId)
        break
      const source = blockTable.getEntityById(entityResult.objectId)
      if (!isOffsettableCurve(source)) {
        AcApDocManager.instance.editor.showMessage(
          AcApI18n.t('jig.offset.cannotOffset')
        )
        continue
      }
      const offsetLayer =
        layerMode === 'source' ? source.layer : (db.clayer ?? source.layer)

      const sidePrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.offset.sideToOffset')
      )
      if (throughMode) {
        sidePrompt.distanceInput = {
          getDistance: point => computeThroughDistance(source, point),
          resolvePoint: (typedDistance, referencePoint) =>
            resolveThroughPoint(source, typedDistance, referencePoint)
        }
      }
      sidePrompt.jig = new AcApOffsetPreviewJig(
        context.view,
        source,
        throughMode
          ? point => computeThroughDistance(source, point)
          : distance!,
        offsetLayer
      )
      const sideResult: AcEdPromptPointResult =
        await AcApDocManager.instance.editor.getPoint(sidePrompt)
      if (sideResult.status !== AcEdPromptStatus.OK || !sideResult.value)
        continue

      const pickPoint = new AcGePoint3d(sideResult.value)
      const effectiveDist = throughMode
        ? computeThroughDistance(source, pickPoint)
        : distance!
      const offsetEntities =
        effectiveDist > 0
          ? buildOffsetCurves(source, effectiveDist, pickPoint, offsetLayer)
          : []

      if (offsetEntities.length === 0) {
        AcApDocManager.instance.editor.showMessage(
          AcApI18n.t('jig.offset.cannotOffset')
        )
        continue
      }
      blockTable.modelSpace.appendEntity(offsetEntities)
      if (eraseSource) blockTable.removeEntity([source.objectId])
    }
    context.view.selectionSet.clear()
  }
}
