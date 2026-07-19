import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
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
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapRunDatabaseEdit } from '../../util/AcApDatabaseEdit'
import {
  AcApBlockInsertSession,
  type AcApBlockInsertSessionOptions
} from './AcApBlockInsertSession'
import { isInsertableBlockName } from './isInsertableBlockName'

/**
 * Preview jig for `-INSERT` — shows the block reference while the user picks
 * insertion point, scale, or rotation.
 */
class AcApInsertJig extends AcEdPreviewJig<AcGePoint3dLike | number> {
  private readonly _entity: AcDbBlockReference
  private _mode: 'point' | 'scale' | 'rotation' = 'point'
  private _position = new AcGePoint3d()
  private _scaleX = 1
  private _scaleY = 1
  private _scaleZ = 1
  private _rotationRad = 0

  constructor(view: AcEdBaseView, blockName: string) {
    super(view)
    this._entity = new AcDbBlockReference(blockName)
    this.applyGeometry()
  }

  get entity(): AcDbBlockReference {
    return this._entity
  }

  setMode(mode: 'point' | 'scale' | 'rotation') {
    this._mode = mode
  }

  setPosition(point: AcGePoint3dLike) {
    this._position = new AcGePoint3d(point)
    this.applyGeometry()
  }

  setUniformScale(scale: number) {
    this._scaleX = scale
    this._scaleY = scale
    this._scaleZ = scale
    this.applyGeometry()
  }

  setScaleFactors(scaleX: number, scaleY: number, scaleZ: number) {
    this._scaleX = scaleX
    this._scaleY = scaleY
    this._scaleZ = scaleZ
    this.applyGeometry()
  }

  setRotationRad(rotationRad: number) {
    this._rotationRad = rotationRad
    this.applyGeometry()
  }

  update(value: AcGePoint3dLike | number) {
    if (this._mode === 'point' && typeof value !== 'number') {
      this.setPosition(value)
      return
    }
    if (typeof value !== 'number') return
    if (this._mode === 'scale') {
      this.setUniformScale(value > 0 ? value : this._scaleX)
      return
    }
    if (this._mode === 'rotation') {
      // Angle prompts provide degrees.
      this.setRotationRad((value * Math.PI) / 180)
    }
  }

  private applyGeometry() {
    this._entity.position = new AcGePoint3d(this._position)
    this._entity.scaleFactors = new AcGePoint3d(
      this._scaleX,
      this._scaleY,
      this._scaleZ
    )
    this._entity.rotation = this._rotationRad
  }
}

/**
 * `-INSERT` (alias: `I`) — inserts an existing block definition into model space.
 *
 * Flow (AutoCAD-aligned command-line INSERT):
 * 1. Enter block name
 * 2. Specify insertion point
 * 3. Specify scale factor (default 1) — skipped when session options fix scale
 * 4. Specify rotation angle (default 0) — skipped when session options fix rotation
 * 5. Append {@link AcDbBlockReference} to model space
 *
 * When started from the Blocks palette, {@link AcApBlockInsertSession} may
 * supply fixed scale/rotation and repeat-placement behavior.
 *
 * Attribute dialogs (ATTDIA / ATTREQ) are out of scope for this implementation.
 *
 * @see https://help.autodesk.com/view/ACD/2024/ENU/?caas=caas/documentation/ACDLT/2014/ENU/files/GUID-BB831F94-6385-4490-8DE9-7C565CD1B639-htm.html
 */
export class AcApInsertCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const blockTable = db.tables.blockTable
    const session = AcApBlockInsertSession.consume()

    const namePrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.insert.blockName')
    )
    const nameResult =
      await AcApDocManager.instance.editor.getString(namePrompt)
    if (nameResult.status !== AcEdPromptStatus.OK) {
      return
    }

    const blockName = String(nameResult.stringResult ?? '').trim()
    if (!isInsertableBlockName(blockName)) {
      this.showMessage(AcApI18n.t('jig.insert.invalidBlockName'), 'warning')
      return
    }
    if (!blockTable.has(blockName)) {
      this.showMessage(
        `${AcApI18n.t('jig.insert.blockNotFound')}: ${blockName}`,
        'warning'
      )
      return
    }

    const btr = blockTable.getAt(blockName) as AcDbBlockTableRecord | undefined
    if (btr?.isXref) {
      this.showMessage(AcApI18n.t('jig.insert.xrefNotAllowed'), 'warning')
      return
    }

    const jig = new AcApInsertJig(context.view, blockName)

    try {
      do {
        const placed = await this.placeOne(
          context,
          blockName,
          jig,
          session
        )
        if (!placed) return
      } while (session?.repeatPlacement)
    } finally {
      jig.end()
    }
  }

  /**
   * Prompts for one insertion (point + optional scale/rotation) and commits.
   *
   * @returns `true` when an instance was appended; `false` on cancel/error
   */
  private async placeOne(
    context: AcApContext,
    blockName: string,
    jig: AcApInsertJig,
    session: AcApBlockInsertSessionOptions | null
  ): Promise<boolean> {
    const db = context.doc.database

    jig.setMode('point')
    const insertionPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.insert.insertionPoint')
    )
    insertionPrompt.jig = jig
    const insertionResult =
      await AcApDocManager.instance.editor.getPoint(insertionPrompt)
    if (
      insertionResult.status !== AcEdPromptStatus.OK ||
      !insertionResult.value
    ) {
      return false
    }
    const insertionPoint = new AcGePoint3d(insertionResult.value)
    jig.setPosition(insertionPoint)

    let scaleX = 1
    let scaleY = 1
    let scaleZ = 1
    const specifyScale = session?.specifyScale !== false
    if (!specifyScale && session) {
      scaleX = positiveOr(session.scaleX, 1)
      scaleY = positiveOr(session.scaleY, scaleX)
      scaleZ = positiveOr(session.scaleZ, scaleX)
      jig.setScaleFactors(scaleX, scaleY, scaleZ)
    } else {
      jig.setMode('scale')
      const scalePrompt = new AcEdPromptDoubleOptions(
        `${AcApI18n.t('jig.insert.scale')} <1>`
      )
      scalePrompt.allowNone = true
      scalePrompt.allowNegative = false
      scalePrompt.allowZero = false
      scalePrompt.useDefaultValue = true
      scalePrompt.defaultValue = 1
      scalePrompt.jig = jig
      const scaleResult =
        await AcApDocManager.instance.editor.getDouble(scalePrompt)
      if (
        scaleResult.status === AcEdPromptStatus.Cancel ||
        scaleResult.status === AcEdPromptStatus.Error
      ) {
        return false
      }
      const scale =
        scaleResult.status === AcEdPromptStatus.OK &&
        scaleResult.value !== undefined
          ? scaleResult.value
          : 1
      if (!(scale > 0)) {
        this.showMessage(AcApI18n.t('jig.insert.invalidScale'), 'warning')
        return false
      }
      scaleX = scaleY = scaleZ = scale
      jig.setUniformScale(scale)
    }

    let rotationDeg = 0
    const specifyRotation = session?.specifyRotation !== false
    if (!specifyRotation && session) {
      rotationDeg = Number.isFinite(session.rotationDeg)
        ? (session.rotationDeg as number)
        : 0
      jig.setRotationRad((rotationDeg * Math.PI) / 180)
    } else {
      jig.setMode('rotation')
      const rotationPrompt = new AcEdPromptAngleOptions(
        `${AcApI18n.t('jig.insert.rotation')} <0>`
      )
      rotationPrompt.allowNone = true
      rotationPrompt.allowNegative = true
      rotationPrompt.allowZero = true
      rotationPrompt.useDefaultValue = true
      rotationPrompt.defaultValue = 0
      rotationPrompt.useBasePoint = true
      rotationPrompt.useDashedLine = true
      rotationPrompt.basePoint = insertionPoint
      rotationPrompt.jig = jig
      const rotationResult =
        await AcApDocManager.instance.editor.getAngle(rotationPrompt)
      if (
        rotationResult.status === AcEdPromptStatus.Cancel ||
        rotationResult.status === AcEdPromptStatus.Error
      ) {
        return false
      }
      rotationDeg =
        rotationResult.status === AcEdPromptStatus.OK &&
        rotationResult.value !== undefined
          ? rotationResult.value
          : 0
    }

    const rotationRad = (rotationDeg * Math.PI) / 180

    acapRunDatabaseEdit(db, 'INSERT', () => {
      const insert = new AcDbBlockReference(blockName)
      insert.position = insertionPoint
      insert.scaleFactors = new AcGePoint3d(scaleX, scaleY, scaleZ)
      insert.rotation = rotationRad
      db.tables.blockTable.modelSpace.appendEntity(insert)
    })
    return true
  }
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && value > 0 ? value : fallback
}
