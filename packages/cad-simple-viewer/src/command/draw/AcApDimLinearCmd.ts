import {
  AcDbDatabase,
  AcDbRotatedDimension,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptAngleOptions,
  AcEdPromptEntityOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  addCommonDimKeywords,
  addDimKeyword,
  applyCurrentDimStyle,
  rememberCreatedDimension,
  commitDimBlock,
  definitionPointsFromEntity,
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  inferLinearRotation,
  rebuildPreviewBlock,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimlinear'

export class AcApDimLinearJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbRotatedDimension
  private _forcedRotation: number | null

  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    xLine1Point: AcGePoint3dLike,
    xLine2Point: AcGePoint3dLike,
    forcedRotation: number | null = null
  ) {
    super(view)
    this._db = db
    this._forcedRotation = forcedRotation
    this._dim = new AcDbRotatedDimension(xLine1Point, xLine2Point, xLine1Point)
    applyCurrentDimStyle(this._dim, db)
    const rot =
      forcedRotation ?? inferLinearRotation(xLine1Point, xLine2Point, xLine1Point)
    this._dim.rotation = rot
  }

  get entity(): AcDbRotatedDimension {
    return this._dim
  }

  setForcedRotation(rotation: number | null) {
    this._forcedRotation = rotation
  }

  update(point: AcGePoint3dLike) {
    this._dim.dimLinePoint = point
    this._dim.rotation =
      this._forcedRotation ??
      inferLinearRotation(
        this._dim.xLine1Point,
        this._dim.xLine2Point,
        point
      )
    rebuildPreviewBlock(this._db, this._dim, DIM_PREVIEW_BLOCK)
  }

  end() {
    super.end()
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }
}

/**
 * DIMLINEAR — create a horizontal, vertical, or rotated linear dimension
 * (AcDbRotatedDimension), matching AutoCAD prompts and keywords.
 */
export class AcApDimLinearCmd extends AcEdCommand {
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

    let forcedRotation: number | null = null
    let customText: string | null = null
    let textAngle: number | undefined

    const jig = new AcApDimLinearJig(
      context.view,
      db,
      xLine1Point,
      xLine2Point,
      forcedRotation
    )

    for (;;) {
      jig.setForcedRotation(forcedRotation)
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.dimLinePoint`)
      )
      addCommonDimKeywords(prompt, I18N)
      addDimKeyword(prompt, 'horizontal', I18N)
      addDimKeyword(prompt, 'vertical', I18N)
      addDimKeyword(prompt, 'rotated', I18N)
      prompt.jig = jig

      const result = await editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Cancel) {
        jig.end()
        return
      }

      if (result.status === AcEdPromptStatus.Keyword) {
        const key = (result.stringResult ?? '').toUpperCase()
        if (await handleCommonDimKeyword(key, jig.entity, I18N)) {
          customText = jig.entity.dimensionText
          textAngle = jig.entity.textRotation
          continue
        }
        if (key === 'HORIZONTAL' || key === 'H') {
          forcedRotation = 0
          continue
        }
        if (key === 'VERTICAL' || key === 'V') {
          forcedRotation = Math.PI / 2
          continue
        }
        if (key === 'ROTATED' || key === 'R') {
          const anglePrompt = new AcEdPromptAngleOptions(
            AcApI18n.t(`${I18N}.rotationAngle`)
          )
          anglePrompt.allowNegative = true
          anglePrompt.allowZero = true
          const angleResult = await editor.getAngle(anglePrompt)
          if (
            angleResult.status === AcEdPromptStatus.OK &&
            angleResult.value != null
          ) {
            forcedRotation = (angleResult.value * Math.PI) / 180
          }
          continue
        }
        continue
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        jig.end()
        return
      }

      const dimLinePoint = result.value
      jig.end()

      const dimension = new AcDbRotatedDimension(
        xLine1Point,
        xLine2Point,
        dimLinePoint
      )
      applyCurrentDimStyle(dimension, db)
      dimension.rotation =
        forcedRotation ??
        inferLinearRotation(xLine1Point, xLine2Point, dimLinePoint)
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
    const points = definitionPointsFromEntity(entity)
    return points
  }
}
