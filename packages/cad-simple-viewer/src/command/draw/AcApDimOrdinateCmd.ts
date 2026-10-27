import {
  AcDbDatabase,
  AcDbOrdinateDimension,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  addCommonDimKeywords,
  addDimKeyword,
  applyCurrentDimStyle,
  commitDimBlock,
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  rebuildPreviewBlock,
  rememberCreatedDimension,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimordinate'

export class AcApDimOrdinateJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbOrdinateDimension
  private _feature: AcGePoint3dLike
  forcedAxis: 'x' | 'y' | null = null

  constructor(view: AcEdBaseView, db: AcDbDatabase, feature: AcGePoint3dLike) {
    super(view)
    this._db = db
    this._feature = feature
    this._dim = new AcDbOrdinateDimension(feature, feature)
    applyCurrentDimStyle(this._dim, db)
  }

  get entity(): AcDbOrdinateDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    this._dim.definingPoint = new AcGePoint3d().copy(this._feature)
    this._dim.leaderEndPoint = new AcGePoint3d().copy(point)
    this._dim.useXAxis = this.resolveXAxis(point)
    rebuildPreviewBlock(this._db, this._dim, DIM_PREVIEW_BLOCK)
  }

  end() {
    super.end()
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }

  private resolveXAxis(point: AcGePoint3dLike) {
    if (this.forcedAxis === 'x') return true
    if (this.forcedAxis === 'y') return false
    const dx = Math.abs(point.x - this._feature.x)
    const dy = Math.abs(point.y - this._feature.y)
    return dx >= dy
  }
}

/**
 * DIMORDINATE — X or Y coordinate from the current origin (0,0 unless set).
 */
export class AcApDimOrdinateCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const featurePrompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${I18N}.featurePoint`)
    )
    const feature = await editor.getPoint(featurePrompt)
    if (feature.status !== AcEdPromptStatus.OK || !feature.value) return

    const jig = new AcApDimOrdinateJig(context.view, db, feature.value)
    let customText: string | null = null
    let textAngle: number | undefined

    for (;;) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t(`${I18N}.leaderEndpoint`)
      )
      addCommonDimKeywords(prompt, I18N)
      addDimKeyword(prompt, 'xdatum', I18N)
      addDimKeyword(prompt, 'ydatum', I18N)
      prompt.jig = jig
      const result = await editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Cancel) {
        jig.end()
        return
      }
      if (result.status === AcEdPromptStatus.Keyword) {
        const key = (result.stringResult ?? '').toUpperCase()
        if (key === 'X' || key === 'XDATUM') {
          jig.forcedAxis = 'x'
          continue
        }
        if (key === 'Y' || key === 'YDATUM') {
          jig.forcedAxis = 'y'
          continue
        }
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
      jig.end()
      const dimension = new AcDbOrdinateDimension(feature.value, result.value)
      applyCurrentDimStyle(dimension, db)
      dimension.useXAxis = jig.forcedAxis
        ? jig.forcedAxis === 'x'
        : Math.abs(result.value.x - feature.value.x) >=
          Math.abs(result.value.y - feature.value.y)
      if (customText != null) dimension.dimensionText = customText
      if (textAngle != null) dimension.textRotation = textAngle
      commitDimBlock(db, dimension)
      db.tables.blockTable.modelSpace.appendEntity(dimension)
      rememberCreatedDimension(dimension.objectId)
      return
    }
  }
}
