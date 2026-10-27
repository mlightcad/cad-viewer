import {
  AcDbAlignedDimension,
  AcDbDatabase,
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
  definitionPointsFromEntity,
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  rebuildPreviewBlock,
  rememberCreatedDimension,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimaligned'

export class AcApDimAlignedJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbAlignedDimension

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    xLine1Point: AcGePoint3dLike,
    xLine2Point: AcGePoint3dLike
  ) {
    super(view)
    this._db = db
    this._dim = new AcDbAlignedDimension(xLine1Point, xLine2Point, xLine1Point)
    applyCurrentDimStyle(this._dim, db)
  }

  get entity(): AcDbAlignedDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    this._dim.dimLinePoint = point
    const dx = this._dim.xLine2Point.x - this._dim.xLine1Point.x
    const dy = this._dim.xLine2Point.y - this._dim.xLine1Point.y
    this._dim.rotation = Math.atan2(dy, dx)
    rebuildPreviewBlock(this._db, this._dim, DIM_PREVIEW_BLOCK)
  }

  end() {
    super.end()
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }
}

/**
 * DIMALIGNED — create an aligned dimension (AcDbAlignedDimension).
 */
export class AcApDimAlignedCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const points = await this.promptDefinitionPoints()
    if (!points) return
    const { xLine1Point, xLine2Point } = points

    let customText: string | null = null
    let textAngle: number | undefined

    const jig = new AcApDimAlignedJig(
      context.view,
      db,
      xLine1Point,
      xLine2Point
    )

    for (;;) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.dimLinePoint`)
      )
      addCommonDimKeywords(prompt, I18N)
      prompt.jig = jig

      const result = await editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Cancel) {
        jig.end()
        return
      }

      if (result.status === AcEdPromptStatus.Keyword) {
        if (await handleCommonDimKeyword(result.stringResult, jig.entity, I18N)) {
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

      jig.end()
      const dimension = new AcDbAlignedDimension(
        xLine1Point,
        xLine2Point,
        result.value
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

  private async promptDefinitionPoints(): Promise<{
    xLine1Point: AcGePoint3dLike
    xLine2Point: AcGePoint3dLike
  } | null> {
    const editor = AcApDocManager.instance.editor

    const firstPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.xLine1Point`)
    )
    firstPrompt.allowNone = true
    const first = await editor.getPoint(firstPrompt)
    if (first.status === AcEdPromptStatus.Cancel) return null

    if (first.status === AcEdPromptStatus.None) {
      return this.promptObjectDefinitionPoints()
    }
    if (first.status !== AcEdPromptStatus.OK || !first.value) return null

    const secondPrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.xLine2Point`)
    )
    secondPrompt.useBasePoint = true
    secondPrompt.useDashedLine = true
    secondPrompt.basePoint = new AcGePoint3d().copy(first.value)
    const second = await editor.getPoint(secondPrompt)
    if (second.status !== AcEdPromptStatus.OK || !second.value) return null

    return { xLine1Point: first.value, xLine2Point: second.value }
  }

  private async promptObjectDefinitionPoints(): Promise<{
    xLine1Point: AcGePoint3dLike
    xLine2Point: AcGePoint3dLike
  } | null> {
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database

    const entityPrompt = new AcEdPromptEntityOptions(
      AcApI18n.t(`${I18N}.selectObject`)
    )
    entityPrompt.addAllowedClass('Line')
    entityPrompt.addAllowedClass('Circle')
    entityPrompt.addAllowedClass('Arc')
    entityPrompt.addAllowedClass('Polyline')
    entityPrompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectObject`))

    const picked = await editor.getEntity(entityPrompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return null

    const entity = db.tables.blockTable.getEntityById(picked.objectId)
    return definitionPointsFromEntity(entity)
  }
}
