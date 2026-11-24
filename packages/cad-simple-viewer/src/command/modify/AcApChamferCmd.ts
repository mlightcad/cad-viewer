import {
  AcDbBlockTableRecord,
  acdbChamferPolyline,
  acdbChamferTwoEntities,
  AcDbDatabase,
  AcDbEntity,
  acdbIsChamferableEntity,
  AcDbObjectId,
  AcDbPolyline,
  acdbPreviewChamferTwoEntities,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import type { AcApContext } from '../../app/AcApContext.js'
import { AcApDocManager } from '../../app/AcApDocManager.js'
import { AcEdCommand } from '../../editor/command/AcEdCommand.js'
import { AcEdPreviewJig } from '../../editor/input/AcEdPreviewJig.js'
import type { AcEdEntityHoverSample } from '../../editor/input/prompt/AcEdEntityHoverSample.js'
import { AcEdPromptDistanceOptions } from '../../editor/input/prompt/AcEdPromptDistanceOptions.js'
import { AcEdPromptDoubleOptions } from '../../editor/input/prompt/AcEdPromptDoubleOptions.js'
import { AcEdPromptEntityOptions } from '../../editor/input/prompt/AcEdPromptEntityOptions.js'
import { AcEdPromptKeywordOptions } from '../../editor/input/prompt/AcEdPromptKeywordOptions.js'
import { AcEdPromptStatus } from '../../editor/input/prompt/AcEdPromptStatus.js'
import type { AcEdBaseView } from '../../editor/view/AcEdBaseView.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'

type ChamferKeyword =
  | 'Undo'
  | 'Polyline'
  | 'Distance'
  | 'Angle'
  | 'Trim'
  | 'Method'
  | 'Multiple'

type ChamferPreviewMode =
  | { method: 'distance'; distance1: number; distance2: number }
  | { method: 'angle'; length: number; angle: number }

/**
 * CHAMFER: bevels the edges of two 2D linear objects, or every vertex of a
 * 2D polyline — matching AutoCAD CHAMFER (2D only; no 3D solids).
 *
 * Settings are stored in AutoCAD system variables: CHAMFERA–D, CHAMMODE,
 * TRIMMODE (shared with FILLET).
 *
 * Geometry and entity mutation live in `@mlightcad/data-model`
 * (`acdbChamferTwoEntities` / `acdbChamferPolyline`).
 */
export class AcApChamferCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    let multiple = false

    this.showMessage(this.settingsMessage(db))

    while (true) {
      const first = await this.promptFirstLine()
      if (first === 'cancel') return
      if (first === 'done') return

      if (first.kind === 'keyword') {
        if (first.keyword === 'Undo') {
          this.showMessage(AcApI18n.t('jig.chamfer.nothingToUndo'), 'warning')
          continue
        }
        if (first.keyword === 'Distance') {
          if (!(await this.promptDistances(db))) return
          continue
        }
        if (first.keyword === 'Angle') {
          if (!(await this.promptAngle(db))) return
          continue
        }
        if (first.keyword === 'Trim') {
          if (!(await this.promptTrimMode(db))) return
          continue
        }
        if (first.keyword === 'Method') {
          if (!(await this.promptMethod(db))) return
          continue
        }
        if (first.keyword === 'Multiple') {
          multiple = true
          continue
        }
        if (first.keyword === 'Polyline') {
          const result = await this.runPolylineMode(context)
          if (result === 'cancel') return
          if (!multiple) return
          continue
        }
        continue
      }

      const e1ForPreview = context.doc.database.getObjectById(
        first.objectId
      ) as AcDbEntity | undefined
      const pick1 = first.pickedPoint ?? { x: 0, y: 0, z: 0 }

      // Keep the first selection while Distance/Angle/Method are adjusted.
      let second: Awaited<ReturnType<AcApChamferCmd['promptSecondLine']>>
      while (true) {
        second = await this.promptSecondLine(
          context.view,
          db,
          e1ForPreview,
          pick1
        )
        if (second === 'cancel') return
        if (second.kind === 'keyword') {
          if (second.keyword === 'Distance') {
            if (!(await this.promptDistances(db))) return
          } else if (second.keyword === 'Angle') {
            if (!(await this.promptAngle(db))) return
          } else if (second.keyword === 'Method') {
            if (!(await this.promptMethod(db))) return
          }
          continue
        }
        break
      }

      const shiftCorner = editor.getInputModifiers().shiftKey
      const e1 = context.doc.database.openEntityForWrite(first.objectId)
      const e2 = context.doc.database.openEntityForWrite(second.objectId)
      if (
        !e1 ||
        !e2 ||
        !acdbIsChamferableEntity(e1) ||
        !acdbIsChamferableEntity(e2)
      ) {
        this.showMessage(AcApI18n.t('jig.chamfer.rejectObject'), 'warning')
        if (!multiple) return
        continue
      }

      const pick2 = second.pickedPoint ?? { x: 0, y: 0, z: 0 }
      const mode = shiftCorner
        ? ({ method: 'distance', distance1: 0, distance2: 0 } as const)
        : this.currentMode(db)

      const outcome = acdbChamferTwoEntities(e1, pick1, e2, pick2, {
        mode,
        trim: this.trimMode(db)
      })

      if (!outcome.ok) {
        this.showMessage(
          AcApI18n.t(`jig.chamfer.error.${outcome.error}`),
          'warning'
        )
        if (!multiple) return
        continue
      }

      const space = resolveOwnerSpace(context, e1.ownerId)
      for (const entity of outcome.result.created) {
        space.appendEntity(entity)
      }
      if (outcome.result.erase.length > 0) {
        const ids = outcome.result.erase
          .map(e => e.objectId)
          .filter((id): id is AcDbObjectId => !!id)
        const erased = context.doc.entityService.eraseEntities(ids)
        if (erased !== ids.length) {
          this.showMessage(AcApI18n.t('jig.chamfer.eraseFailed'), 'warning')
          if (!multiple) return
          continue
        }
      }
      if (outcome.result.created.length > 0) {
        context.view.addEntity(outcome.result.created)
      }

      if (!multiple) return
    }
  }

  private trimMode(db: AcDbDatabase): boolean {
    return readNumberSysVar(AcDbSystemVariables.TRIMMODE, db, 1) !== 0
  }

  private chamMode(db: AcDbDatabase): number {
    return readNumberSysVar(AcDbSystemVariables.CHAMMODE, db, 0)
  }

  private setSysVar(name: string, value: number, db: AcDbDatabase) {
    AcDbSysVarManager.instance().setVar(name, value, db)
  }

  private currentMode(db: AcDbDatabase): ChamferPreviewMode {
    if (this.chamMode(db) === 1) {
      return {
        method: 'angle',
        length: readNumberSysVar(AcDbSystemVariables.CHAMFERC, db, 0),
        // CHAMFERD is degrees in AutoCAD; geometry expects radians.
        angle:
          (readNumberSysVar(AcDbSystemVariables.CHAMFERD, db, 0) * Math.PI) /
          180
      }
    }
    return {
      method: 'distance',
      distance1: readNumberSysVar(AcDbSystemVariables.CHAMFERA, db, 0),
      distance2: readNumberSysVar(AcDbSystemVariables.CHAMFERB, db, 0)
    }
  }

  private settingsMessage(db: AcDbDatabase): string {
    const trim = this.trimMode(db)
    if (this.chamMode(db) === 1) {
      return AcApI18n.t('jig.chamfer.currentSettingsAngle')
        .replace(
          '{mode}',
          trim
            ? AcApI18n.t('jig.chamfer.modeTrim')
            : AcApI18n.t('jig.chamfer.modeNoTrim')
        )
        .replace(
          '{length}',
          formatNum(readNumberSysVar(AcDbSystemVariables.CHAMFERC, db, 0))
        )
        .replace(
          '{angle}',
          formatNum(readNumberSysVar(AcDbSystemVariables.CHAMFERD, db, 0))
        )
    }
    return AcApI18n.t('jig.chamfer.currentSettings')
      .replace(
        '{mode}',
        trim
          ? AcApI18n.t('jig.chamfer.modeTrim')
          : AcApI18n.t('jig.chamfer.modeNoTrim')
      )
      .replace(
        '{dist1}',
        formatNum(readNumberSysVar(AcDbSystemVariables.CHAMFERA, db, 0))
      )
      .replace(
        '{dist2}',
        formatNum(readNumberSysVar(AcDbSystemVariables.CHAMFERB, db, 0))
      )
  }

  private async promptFirstLine(): Promise<
    | { kind: 'entity'; objectId: AcDbObjectId; pickedPoint?: AcGePoint3dLike }
    | { kind: 'keyword'; keyword: ChamferKeyword }
    | 'cancel'
    | 'done'
  > {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.chamfer.selectFirst')
    )
    prompt.allowNone = true
    prompt.setRejectMessage(AcApI18n.t('jig.chamfer.rejectObject'))
    ;(
      [
        'undo',
        'polyline',
        'distance',
        'angle',
        'trim',
        'method',
        'multiple'
      ] as const
    ).forEach(key => addChamferKeyword(prompt, key))

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.None) return 'done'
    if (result.status === AcEdPromptStatus.Keyword) {
      return {
        kind: 'keyword',
        keyword: (result.stringResult ?? '') as ChamferKeyword
      }
    }
    if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
      return 'cancel'
    }
    return {
      kind: 'entity',
      objectId: result.objectId,
      pickedPoint: result.pickedPoint
    }
  }

  private async promptSecondLine(
    view: AcEdBaseView,
    db: AcDbDatabase,
    firstEntity: AcDbEntity | undefined,
    pick1: AcGePoint3dLike
  ): Promise<
    | { kind: 'entity'; objectId: AcDbObjectId; pickedPoint?: AcGePoint3dLike }
    | { kind: 'keyword'; keyword: ChamferKeyword }
    | 'cancel'
  > {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.chamfer.selectSecond')
    )
    prompt.setRejectMessage(AcApI18n.t('jig.chamfer.rejectObject'))
    addChamferKeyword(prompt, 'distance')
    addChamferKeyword(prompt, 'angle')
    addChamferKeyword(prompt, 'method')

    if (
      firstEntity &&
      acdbIsChamferableEntity(firstEntity) &&
      isCommandPreviewOn(db)
    ) {
      const jig = new AcApChamferPreviewJig(view, firstEntity, pick1, () =>
        this.currentMode(db)
      )
      jig.update({ pickedPoint: { ...view.curPos, z: 0 } })
      jig.render()
      prompt.jig = jig
    }

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.Keyword) {
      return {
        kind: 'keyword',
        keyword: (result.stringResult ?? '') as ChamferKeyword
      }
    }
    if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
      return 'cancel'
    }
    return {
      kind: 'entity',
      objectId: result.objectId,
      pickedPoint: result.pickedPoint
    }
  }

  private async runPolylineMode(
    context: AcApContext
  ): Promise<'cancel' | 'done'> {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.chamfer.selectPolyline')
    )
    prompt.addAllowedClass('Polyline')
    prompt.setRejectMessage(AcApI18n.t('jig.chamfer.rejectPolyline'))
    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
      return 'cancel'
    }
    const entity = context.doc.database.openEntityForWrite(result.objectId)
    if (!(entity instanceof AcDbPolyline)) {
      this.showMessage(AcApI18n.t('jig.chamfer.rejectPolyline'), 'warning')
      return 'cancel'
    }
    const db = context.doc.database
    const stats = acdbChamferPolyline(entity, {
      mode: this.currentMode(db),
      trim: this.trimMode(db)
    })
    this.showMessage(
      AcApI18n.t('jig.chamfer.polylineResult')
        .replace('{chamfered}', String(stats.chamfered))
        .replace('{skipped}', String(stats.skipped))
    )
    return 'done'
  }

  private async promptDistances(db: AcDbDatabase): Promise<boolean> {
    this.setSysVar(AcDbSystemVariables.CHAMMODE, 0, db)
    const dist1 = readNumberSysVar(AcDbSystemVariables.CHAMFERA, db, 0)
    const first = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.chamfer.specifyDist1')
    )
    first.allowNegative = false
    first.allowZero = true
    first.defaultValue = dist1
    first.useDefaultValue = true
    first.allowNone = true
    const r1 = await AcApDocManager.instance.editor.getDistance(first)
    let nextDist1 = dist1
    if (r1.status === AcEdPromptStatus.None) {
      // keep existing
    } else if (r1.status !== AcEdPromptStatus.OK || r1.value == null) {
      return false
    } else {
      nextDist1 = r1.value
      this.setSysVar(AcDbSystemVariables.CHAMFERA, nextDist1, db)
    }

    const second = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.chamfer.specifyDist2')
    )
    second.allowNegative = false
    second.allowZero = true
    second.defaultValue = nextDist1
    second.useDefaultValue = true
    second.allowNone = true
    const r2 = await AcApDocManager.instance.editor.getDistance(second)
    if (r2.status === AcEdPromptStatus.None) {
      this.setSysVar(AcDbSystemVariables.CHAMFERB, nextDist1, db)
    } else if (r2.status !== AcEdPromptStatus.OK || r2.value == null) {
      return false
    } else {
      this.setSysVar(AcDbSystemVariables.CHAMFERB, r2.value, db)
    }
    return true
  }

  private async promptAngle(db: AcDbDatabase): Promise<boolean> {
    this.setSysVar(AcDbSystemVariables.CHAMMODE, 1, db)
    const length = readNumberSysVar(AcDbSystemVariables.CHAMFERC, db, 0)
    const lengthPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.chamfer.specifyLength')
    )
    lengthPrompt.allowNegative = false
    lengthPrompt.allowZero = true
    lengthPrompt.defaultValue = length
    lengthPrompt.useDefaultValue = true
    lengthPrompt.allowNone = true
    const lengthResult =
      await AcApDocManager.instance.editor.getDistance(lengthPrompt)
    if (lengthResult.status === AcEdPromptStatus.None) {
      // keep
    } else if (
      lengthResult.status !== AcEdPromptStatus.OK ||
      lengthResult.value == null
    ) {
      return false
    } else {
      this.setSysVar(AcDbSystemVariables.CHAMFERC, lengthResult.value, db)
    }

    const angleDeg = readNumberSysVar(AcDbSystemVariables.CHAMFERD, db, 0)
    const anglePrompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('jig.chamfer.specifyAngle')
    )
    anglePrompt.allowNegative = false
    anglePrompt.allowZero = true
    anglePrompt.defaultValue = angleDeg
    anglePrompt.useDefaultValue = true
    anglePrompt.allowNone = true
    const angleResult =
      await AcApDocManager.instance.editor.getDouble(anglePrompt)
    if (angleResult.status === AcEdPromptStatus.None) {
      // keep
    } else if (
      angleResult.status !== AcEdPromptStatus.OK ||
      angleResult.value == null
    ) {
      return false
    } else {
      this.setSysVar(AcDbSystemVariables.CHAMFERD, angleResult.value, db)
    }
    return true
  }

  private async promptTrimMode(db: AcDbDatabase): Promise<boolean> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chamfer.trimPrompt')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.chamfer.keywords.trimMode.display'),
      AcApI18n.t('jig.chamfer.keywords.trimMode.global'),
      AcApI18n.t('jig.chamfer.keywords.trimMode.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.chamfer.keywords.noTrim.display'),
      AcApI18n.t('jig.chamfer.keywords.noTrim.global'),
      AcApI18n.t('jig.chamfer.keywords.noTrim.local')
    )
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return false
    }
    this.setSysVar(
      AcDbSystemVariables.TRIMMODE,
      result.stringResult === 'NoTrim' ? 0 : 1,
      db
    )
    return true
  }

  private async promptMethod(db: AcDbDatabase): Promise<boolean> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.chamfer.methodPrompt')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.chamfer.keywords.distanceMethod.display'),
      AcApI18n.t('jig.chamfer.keywords.distanceMethod.global'),
      AcApI18n.t('jig.chamfer.keywords.distanceMethod.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.chamfer.keywords.angleMethod.display'),
      AcApI18n.t('jig.chamfer.keywords.angleMethod.global'),
      AcApI18n.t('jig.chamfer.keywords.angleMethod.local')
    )
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return false
    }
    this.setSysVar(
      AcDbSystemVariables.CHAMMODE,
      result.stringResult === 'Angle' ? 1 : 0,
      db
    )
    return true
  }
}

/**
 * Transient chamfer-line preview while picking the second object (COMMANDPREVIEW).
 */
class AcApChamferPreviewJig extends AcEdPreviewJig<AcEdEntityHoverSample> {
  private readonly _view: AcEdBaseView
  private readonly _first: AcDbEntity
  private readonly _pick1: AcGePoint3dLike
  private readonly _getMode: () => ChamferPreviewMode
  private _preview: AcDbEntity[] = []
  private _renderedIds: string[] = []

  constructor(
    view: AcEdBaseView,
    first: AcDbEntity,
    pick1: AcGePoint3dLike,
    getMode: () => ChamferPreviewMode
  ) {
    super(view)
    this._view = view
    this._first = first
    this._pick1 = pick1
    this._getMode = getMode
  }

  update(sample: AcEdEntityHoverSample) {
    this.clearRendered()
    this._preview = []
    if (!sample.objectId) return
    const second = AcApDocManager.instance.curDocument?.database.getObjectById(
      sample.objectId
    ) as AcDbEntity | undefined
    if (!second || !acdbIsChamferableEntity(second)) return
    const mode = AcApDocManager.instance.editor.getInputModifiers().shiftKey
      ? ({ method: 'distance', distance1: 0, distance2: 0 } as const)
      : this._getMode()
    this._preview = acdbPreviewChamferTwoEntities(
      this._first,
      this._pick1,
      second,
      sample.pickedPoint,
      { mode }
    )
  }

  override render() {
    if (this._preview.length === 0) return
    this._view.addTransientEntity(this._preview)
    this._renderedIds = this._preview.map(e => e.objectId)
  }

  override end() {
    this.clearRendered()
  }

  private clearRendered() {
    this._renderedIds.forEach(id => this._view.removeTransientEntity(id))
    this._renderedIds = []
    this._preview = []
  }
}

function addChamferKeyword(
  prompt: AcEdPromptEntityOptions,
  key:
    | 'undo'
    | 'polyline'
    | 'distance'
    | 'angle'
    | 'trim'
    | 'method'
    | 'multiple'
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.chamfer.keywords.${key}.display`),
    AcApI18n.t(`jig.chamfer.keywords.${key}.global`),
    AcApI18n.t(`jig.chamfer.keywords.${key}.local`)
  )
}

function isCommandPreviewOn(db: AcDbDatabase): boolean {
  return readNumberSysVar(AcDbSystemVariables.COMMANDPREVIEW, db, 1) !== 0
}

function readNumberSysVar(
  name: string,
  db: AcDbDatabase,
  fallback: number
): number {
  try {
    const raw = AcDbSysVarManager.instance().getVar(name, db)
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4)
}

function resolveOwnerSpace(
  context: AcApContext,
  ownerId: AcDbObjectId
): AcDbBlockTableRecord {
  const owner = context.doc.database.getObjectById(ownerId)
  if (owner instanceof AcDbBlockTableRecord) return owner
  return context.doc.database.tables.blockTable.modelSpace
}
