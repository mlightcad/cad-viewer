import {
  AcDbArc, AcDbCircle, AcDbEllipse, AcDbEntity, AcDbLine,
  AcDbPolyline, AcDbSpline, AcGePoint3d, AcGePoint3dLike,
} from '@mlightcad/data-model'
import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView, AcEdCommand, AcEdOpenMode, AcEdPreviewJig,
  AcEdPromptDistanceOptions, AcEdPromptDoubleResult,
  AcEdPromptEntityOptions, AcEdPromptEntityResult,
  AcEdPromptPointOptions, AcEdPromptPointResult, AcEdPromptStatus,
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  offsetArc, offsetCircle, offsetEllipse, offsetLine,
  offsetPolyline, offsetSpline, pickSide,
} from './AcApOffsetGeometry'

const OFFSETTABLE_TYPES = ['Line', 'Arc', 'Circle', 'Polyline', 'Ellipse', 'Spline']

function computeOffset(entity: AcDbEntity, distance: number, side: 1 | -1): AcDbEntity | null {
  if (entity instanceof AcDbLine) return offsetLine(entity, distance, side)
  if (entity instanceof AcDbArc) return offsetArc(entity, distance, side)
  if (entity instanceof AcDbCircle) return offsetCircle(entity, distance, side)
  if (entity instanceof AcDbEllipse) return offsetEllipse(entity, distance, side)
  if (entity instanceof AcDbPolyline) return offsetPolyline(entity, distance, side)
  if (entity instanceof AcDbSpline) return offsetSpline(entity, distance, side)
  return null
}

function computeThroughDistance(entity: AcDbEntity, p: AcGePoint3dLike): number {
  if (entity instanceof AcDbLine) {
    const s = entity.startPoint; const e = entity.endPoint
    const dx = e.x - s.x; const dy = e.y - s.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return 0
    return Math.abs((dy * p.x - dx * p.y + e.x * s.y - e.y * s.x) / len)
  }
  if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
    const c = (entity as AcDbCircle).center; const r = (entity as AcDbCircle).radius
    return Math.abs(Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2) - r)
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    return Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let minDist = Infinity
    for (let i = 0; i < n - 1; i++) {
      const a = entity.getPoint2dAt(i); const b = entity.getPoint2dAt(i + 1)
      const dx = b.x - a.x; const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
      const d = Math.sqrt((p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2)
      if (d < minDist) minDist = d
    }
    return minDist === Infinity ? 0 : minDist
  }
  return 0
}

class AcApOffsetPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _source: AcDbEntity
  private _distance: number
  private _preview: AcDbEntity | null = null

  constructor(view: AcEdBaseView, source: AcDbEntity, distance: number) {
    super(view)
    this._view = view
    this._source = source
    this._distance = distance
  }

  get entity(): AcDbEntity | null { return this._preview }

  update(point: AcGePoint3dLike): void {
    if (this._preview) {
      this._view.removeTransientEntity(this._preview.objectId)
      this._preview = null
    }
    const result = computeOffset(this._source, this._distance, pickSide(this._source, point))
    if (result) {
      this._preview = result
      this._view.addTransientEntity(result)
    }
  }

  override end(): void {
    if (this._preview) {
      this._view.removeTransientEntity(this._preview.objectId)
      this._preview = null
    }
  }
}

export class AcApOffsetCmd extends AcEdCommand {
  constructor() { super(); this.mode = AcEdOpenMode.Review }

  async execute(context: AcApContext): Promise<void> {
    const db = context.doc.database
    const blockTable = db.tables.blockTable
    let distance: number | undefined
    let throughMode = false
    let eraseSource = false
    let layerMode: 'source' | 'current' = 'source'

    while (distance === undefined && !throughMode) {
      const distPrompt = new AcEdPromptDistanceOptions(AcApI18n.t('jig.offset.distanceOrOptions'))
      distPrompt.useBasePoint = false
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.through.display'), AcApI18n.t('jig.offset.keywords.through.global'), AcApI18n.t('jig.offset.keywords.through.local'))
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.erase.display'), AcApI18n.t('jig.offset.keywords.erase.global'), AcApI18n.t('jig.offset.keywords.erase.local'))
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.layer.display'), AcApI18n.t('jig.offset.keywords.layer.global'), AcApI18n.t('jig.offset.keywords.layer.local'))
      const distResult: AcEdPromptDoubleResult = await AcApDocManager.instance.editor.getDistance(distPrompt)
      if (distResult.status === AcEdPromptStatus.OK) {
        if (distResult.value! <= 0) { AcApDocManager.instance.editor.showMessage(AcApI18n.t('jig.offset.invalidDistance')); continue }
        distance = distResult.value!
      } else if (distResult.status === AcEdPromptStatus.Keyword) {
        const kw = distResult.stringResult ?? ''
        if (kw === 'Through') { throughMode = true; break }
        if (kw === 'Erase') { eraseSource = !eraseSource; continue }
        if (kw === 'Layer') { layerMode = layerMode === 'source' ? 'current' : 'source'; continue }
        return
      } else { return }
    }

    while (true) {
      const entityPrompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.offset.selectObject'))
      entityPrompt.allowNone = true
      entityPrompt.setRejectMessage(AcApI18n.t('jig.offset.cannotOffset'))
      OFFSETTABLE_TYPES.forEach(t => entityPrompt.addAllowedClass(t))
      const entityResult: AcEdPromptEntityResult = await AcApDocManager.instance.editor.getEntity(entityPrompt)
      if (entityResult.status !== AcEdPromptStatus.OK || !entityResult.objectId) break
      const source = blockTable.getEntityById(entityResult.objectId)
      if (!source) break

      const sidePrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.offset.sideToOffset'))
      if (!throughMode) sidePrompt.jig = new AcApOffsetPreviewJig(context.view, source, distance!)
      const sideResult: AcEdPromptPointResult = await AcApDocManager.instance.editor.getPoint(sidePrompt)
      if (sideResult.status !== AcEdPromptStatus.OK || !sideResult.value) continue

      const pickPoint = new AcGePoint3d(sideResult.value)
      const side = pickSide(source, pickPoint)
      const effectiveDist = throughMode ? computeThroughDistance(source, pickPoint) : distance!
      const offsetEntity = effectiveDist > 0 ? computeOffset(source, effectiveDist, side) : null

      if (!offsetEntity) { AcApDocManager.instance.editor.showMessage(AcApI18n.t('jig.offset.cannotOffset')); continue }
      offsetEntity.layer = layerMode === 'source' ? source.layer : (db.clayer ?? source.layer)
      blockTable.modelSpace.appendEntity(offsetEntity)
      if (eraseSource) blockTable.removeEntity([source.objectId])
    }
    context.view.selectionSet.clear()
  }
}
