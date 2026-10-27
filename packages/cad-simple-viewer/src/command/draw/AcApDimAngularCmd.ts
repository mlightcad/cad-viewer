import {
  AcDb3PointAngularDimension,
  AcDbDatabase,
  AcDbLine,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptEntityOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  addCommonDimKeywords,
  applyCurrentDimStyle,
  commitDimBlock,
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  rebuildPreviewBlock,
  rememberCreatedDimension,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimangular'

interface AngularDef {
  center: AcGePoint3dLike
  xLine1Point: AcGePoint3dLike
  xLine2Point: AcGePoint3dLike
}

export class AcApDimAngularJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDb3PointAngularDimension

  constructor(view: AcEdBaseView, db: AcDbDatabase, def: AngularDef) {
    super(view)
    this._db = db
    this._dim = new AcDb3PointAngularDimension(
      def.center,
      def.xLine1Point,
      def.xLine2Point,
      def.xLine1Point
    )
    applyCurrentDimStyle(this._dim, db)
  }

  get entity(): AcDb3PointAngularDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    this._dim.arcPoint = new AcGePoint3d().copy(point)
    rebuildPreviewBlock(this._db, this._dim, DIM_PREVIEW_BLOCK)
  }

  end() {
    super.end()
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }
}

/**
 * DIMANGULAR — create a 3-point (or 2-line) angular dimension.
 */
export class AcApDimAngularCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const def = await this.promptAngularDefinition()
    if (!def) return

    let customText: string | null = null
    let textAngle: number | undefined
    const jig = new AcApDimAngularJig(context.view, db, def)

    for (;;) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.arcPoint`)
      )
      addCommonDimKeywords(prompt, I18N)
      prompt.jig = jig

      const result = await editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Cancel) {
        jig.end()
        return
      }
      if (result.status === AcEdPromptStatus.Keyword) {
        if (
          await handleCommonDimKeyword(result.stringResult, jig.entity, I18N)
        ) {
          customText = jig.entity.dimensionText
          textAngle = jig.entity.textRotation
          continue
        }
        continue
      }
      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        jig.end()
        return
      }

      const arcPoint = result.value
      jig.end()

      const dimension = new AcDb3PointAngularDimension(
        def.center,
        def.xLine1Point,
        def.xLine2Point,
        arcPoint
      )
      applyCurrentDimStyle(dimension, db)
      if (customText != null) dimension.dimensionText = customText
      if (textAngle != null) dimension.textRotation = textAngle

      commitDimBlock(db, dimension)
      db.tables.blockTable.modelSpace.appendEntity(dimension)
      rememberCreatedDimension(dimension.objectId)
      return
    }
  }

  private async promptAngularDefinition(): Promise<AngularDef | null> {
    const editor = AcApDocManager.instance.editor

    // First prompt: vertex / or Enter to select line
    const firstPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.vertexOrSelect`)
    )
    firstPrompt.allowNone = true
    const first = await editor.getPoint(firstPrompt)
    if (first.status === AcEdPromptStatus.Cancel) return null

    if (first.status === AcEdPromptStatus.None) {
      return this.promptTwoLines()
    }
    if (first.status !== AcEdPromptStatus.OK || !first.value) return null

    const center = first.value

    const p1Prompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.xLine1Point`)
    )
    p1Prompt.useBasePoint = true
    p1Prompt.useDashedLine = true
    p1Prompt.basePoint = new AcGePoint3d().copy(center)
    const p1 = await editor.getPoint(p1Prompt)
    if (p1.status !== AcEdPromptStatus.OK || !p1.value) return null

    const p2Prompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.xLine2Point`)
    )
    p2Prompt.useBasePoint = true
    p2Prompt.useDashedLine = true
    p2Prompt.basePoint = new AcGePoint3d().copy(center)
    const p2 = await editor.getPoint(p2Prompt)
    if (p2.status !== AcEdPromptStatus.OK || !p2.value) return null

    return {
      center,
      xLine1Point: p1.value,
      xLine2Point: p2.value
    }
  }

  private async promptTwoLines(): Promise<AngularDef | null> {
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database

    const line1Prompt = new AcEdPromptEntityOptions(
      AcApI18n.t(`${I18N}.selectFirstLine`)
    )
    line1Prompt.addAllowedClass('Line')
    line1Prompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectObject`))
    const l1 = await editor.getEntity(line1Prompt)
    if (l1.status !== AcEdPromptStatus.OK || !l1.objectId) return null

    const line2Prompt = new AcEdPromptEntityOptions(
      AcApI18n.t(`${I18N}.selectSecondLine`)
    )
    line2Prompt.addAllowedClass('Line')
    line2Prompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectObject`))
    const l2 = await editor.getEntity(line2Prompt)
    if (l2.status !== AcEdPromptStatus.OK || !l2.objectId) return null

    const e1 = db.tables.blockTable.getEntityById(l1.objectId)
    const e2 = db.tables.blockTable.getEntityById(l2.objectId)
    if (!(e1 instanceof AcDbLine) || !(e2 instanceof AcDbLine)) return null

    const hit = intersectLines2d(
      e1.startPoint,
      e1.endPoint,
      e2.startPoint,
      e2.endPoint
    )
    if (!hit) {
      this.showMessage(AcApI18n.t(`${I18N}.linesParallel`), 'warning')
      return null
    }

    return {
      center: new AcGePoint3d(hit.x, hit.y, e1.startPoint.z),
      // Prefer the endpoint farther from the intersection so the ray
      // does not collapse when both lines were drawn toward the corner.
      xLine1Point: fartherEndpoint(e1, hit),
      xLine2Point: fartherEndpoint(e2, hit)
    }
  }
}

function fartherEndpoint(
  line: AcDbLine,
  hit: { x: number; y: number }
): AcGePoint3d {
  const d0 =
    (line.startPoint.x - hit.x) ** 2 + (line.startPoint.y - hit.y) ** 2
  const d1 =
    (line.endPoint.x - hit.x) ** 2 + (line.endPoint.y - hit.y) ** 2
  return d0 >= d1 ? line.startPoint.clone() : line.endPoint.clone()
}

function intersectLines2d(
  a0: AcGePoint3dLike,
  a1: AcGePoint3dLike,
  b0: AcGePoint3dLike,
  b1: AcGePoint3dLike
): { x: number; y: number } | null {
  const dax = a1.x - a0.x
  const day = a1.y - a0.y
  const dbx = b1.x - b0.x
  const dby = b1.y - b0.y
  const denom = dax * dby - day * dbx
  if (Math.abs(denom) < 1e-12) return null
  const t = ((b0.x - a0.x) * dby - (b0.y - a0.y) * dbx) / denom
  return { x: a0.x + t * dax, y: a0.y + t * day }
}
