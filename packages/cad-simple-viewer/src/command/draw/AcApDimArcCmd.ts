import {
  AcDbArc,
  AcDbArcDimension,
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
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  rebuildPreviewBlock,
  rememberCreatedDimension,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimarc'

interface ArcDef {
  center: AcGePoint3dLike
  xLine1Point: AcGePoint3dLike
  xLine2Point: AcGePoint3dLike
}

export class AcApDimArcJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbArcDimension

  constructor(view: AcEdBaseView, db: AcDbDatabase, def: ArcDef) {
    super(view)
    this._db = db
    this._dim = new AcDbArcDimension(
      def.center,
      def.xLine1Point,
      def.xLine2Point,
      def.xLine1Point
    )
    applyCurrentDimStyle(this._dim, db)
  }

  get entity(): AcDbArcDimension {
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
 * DIMARC — arc-length dimension from a selected arc.
 */
export class AcApDimArcCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    const def = await this.promptArc()
    if (!def) return

    let customText: string | null = null
    let textAngle: number | undefined
    const jig = new AcApDimArcJig(context.view, db, def)

    for (;;) {
      const prompt = new AcEdPromptPointOptions(AcApI18n.t(`${I18N}.arcPoint`))
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
      jig.end()
      const dimension = new AcDbArcDimension(
        def.center,
        def.xLine1Point,
        def.xLine2Point,
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

  private async promptArc(): Promise<ArcDef | null> {
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t(`${I18N}.selectArc`))
    prompt.addAllowedClass('Arc')
    prompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectObject`))
    const picked = await editor.getEntity(prompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return null
    const entity = db.tables.blockTable.getEntityById(picked.objectId)
    if (!(entity instanceof AcDbArc)) return null
    return {
      center: entity.center.clone(),
      xLine1Point: entity.startPoint.clone(),
      xLine2Point: entity.endPoint.clone()
    }
  }
}
