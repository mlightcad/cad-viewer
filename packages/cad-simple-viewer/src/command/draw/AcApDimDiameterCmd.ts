import {
  AcDbArc,
  AcDbCircle,
  AcDbDatabase,
  AcDbDiametricDimension,
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
  rememberCreatedDimension,
  commitDimBlock,
  DIM_PREVIEW_BLOCK,
  handleCommonDimKeyword,
  rebuildPreviewBlock,
  removePreviewBlock
} from './AcApDimCmdUtil'

const I18N = 'jig.dimdiameter'

interface DiametricTarget {
  center: AcGePoint3dLike
  radius: number
}

export class AcApDimDiameterJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbDiametricDimension
  private _center: AcGePoint3dLike
  private _radius: number

  constructor(view: AcEdBaseView, db: AcDbDatabase, target: DiametricTarget) {
    super(view)
    this._db = db
    this._center = target.center
    this._radius = target.radius
    const chord = new AcGePoint3d(
      target.center.x + target.radius,
      target.center.y,
      target.center.z ?? 0
    )
    const far = new AcGePoint3d(
      target.center.x - target.radius,
      target.center.y,
      target.center.z ?? 0
    )
    this._dim = new AcDbDiametricDimension(chord, far, 0)
    applyCurrentDimStyle(this._dim, db)
  }

  get entity(): AcDbDiametricDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    const dx = point.x - this._center.x
    const dy = point.y - this._center.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const chord = new AcGePoint3d(
      this._center.x + ux * this._radius,
      this._center.y + uy * this._radius,
      this._center.z ?? 0
    )
    const far = new AcGePoint3d(
      this._center.x - ux * this._radius,
      this._center.y - uy * this._radius,
      this._center.z ?? 0
    )
    this._dim.chordPoint = chord
    this._dim.farChordPoint = far
    this._dim.leaderLength = Math.max(0, len - this._radius)
    rebuildPreviewBlock(this._db, this._dim, DIM_PREVIEW_BLOCK)
  }

  end() {
    super.end()
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }
}

/**
 * DIMDIAMETER — create a diametric dimension on a circle or arc.
 */
export class AcApDimDiameterCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const target = await this.promptCircleOrArc()
    if (!target) return

    let customText: string | null = null
    let textAngle: number | undefined
    const jig = new AcApDimDiameterJig(context.view, db, target)

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

      jig.update(result.value)
      const chord = jig.entity.chordPoint.clone()
      const far = jig.entity.farChordPoint.clone()
      const leaderLength = jig.entity.leaderLength
      jig.end()

      const dimension = new AcDbDiametricDimension(chord, far, leaderLength)
      applyCurrentDimStyle(dimension, db)
      if (customText != null) dimension.dimensionText = customText
      if (textAngle != null) dimension.textRotation = textAngle

      commitDimBlock(db, dimension)
      db.tables.blockTable.modelSpace.appendEntity(dimension)
      rememberCreatedDimension(dimension.objectId)
      return
    }
  }

  private async promptCircleOrArc(): Promise<DiametricTarget | null> {
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database

    const entityPrompt = new AcEdPromptEntityOptions(
      AcApI18n.t(`${I18N}.selectObject`)
    )
    entityPrompt.addAllowedClass('Circle')
    entityPrompt.addAllowedClass('Arc')
    entityPrompt.setRejectMessage(AcApI18n.t(`${I18N}.rejectObject`))

    const picked = await editor.getEntity(entityPrompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return null

    const entity = db.tables.blockTable.getEntityById(picked.objectId)
    if (entity instanceof AcDbCircle) {
      return { center: entity.center.clone(), radius: entity.radius }
    }
    if (entity instanceof AcDbArc) {
      return { center: entity.center.clone(), radius: entity.radius }
    }
    return null
  }
}
