import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbEntity,
  acdbFilletPolyline,
  acdbFilletTwoEntities,
  acdbIsFilletableEntity,
  AcDbObjectId,
  AcDbPolyline,
  acdbPreviewFilletTwoEntities,
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
import { AcEdPromptEntityOptions } from '../../editor/input/prompt/AcEdPromptEntityOptions.js'
import { AcEdPromptKeywordOptions } from '../../editor/input/prompt/AcEdPromptKeywordOptions.js'
import { AcEdPromptStatus } from '../../editor/input/prompt/AcEdPromptStatus.js'
import type { AcEdBaseView } from '../../editor/view/AcEdBaseView.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'

type FilletKeyword = 'Undo' | 'Polyline' | 'Radius' | 'Trim' | 'Multiple'

/**
 * FILLET: rounds or fillets the edges of two 2D objects, or every vertex of a
 * 2D polyline — matching AutoCAD FILLET (2D only; no 3D solids).
 *
 * Settings are stored in AutoCAD system variables: {@link AcDbSystemVariables.FILLETRAD},
 * {@link AcDbSystemVariables.TRIMMODE}, {@link AcDbSystemVariables.FILLETPOLYARC}.
 *
 * Geometry and entity mutation live in `@mlightcad/data-model`
 * (`acdbFilletTwoEntities` / `acdbFilletPolyline`).
 */
export class AcApFilletCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    let multiple = false

    this.showMessage(
      AcApI18n.t('jig.fillet.currentSettings')
        .replace(
          '{mode}',
          this.trimMode(db)
            ? AcApI18n.t('jig.fillet.modeTrim')
            : AcApI18n.t('jig.fillet.modeNoTrim')
        )
        .replace('{radius}', formatNum(this.radius(db)))
    )

    while (true) {
      const first = await this.promptFirstObject()
      if (first === 'cancel') return
      if (first === 'done') return

      if (first.kind === 'keyword') {
        if (first.keyword === 'Undo') {
          this.showMessage(AcApI18n.t('jig.fillet.nothingToUndo'), 'warning')
          continue
        }
        if (first.keyword === 'Radius') {
          if (!(await this.promptRadius(db))) return
          continue
        }
        if (first.keyword === 'Trim') {
          if (!(await this.promptTrimMode(db))) return
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

      // Keep the first selection while the user changes Radius (AutoCAD parity).
      let second: Awaited<ReturnType<AcApFilletCmd['promptSecondObject']>>
      while (true) {
        second = await this.promptSecondObject(
          context.view,
          db,
          e1ForPreview,
          pick1
        )
        if (second === 'cancel') return
        if (second.kind === 'keyword') {
          if (second.keyword === 'Radius') {
            if (!(await this.promptRadius(db))) return
            continue
          }
          continue
        }
        break
      }

      const radius = editor.getInputModifiers().shiftKey ? 0 : this.radius(db)
      const e1 = context.doc.database.openEntityForWrite(first.objectId)
      const e2 = context.doc.database.openEntityForWrite(second.objectId)
      if (
        !e1 ||
        !e2 ||
        !acdbIsFilletableEntity(e1) ||
        !acdbIsFilletableEntity(e2)
      ) {
        this.showMessage(AcApI18n.t('jig.fillet.rejectObject'), 'warning')
        if (!multiple) return
        continue
      }

      const pick2 = second.pickedPoint ?? { x: 0, y: 0, z: 0 }
      const outcome = acdbFilletTwoEntities(e1, pick1, e2, pick2, {
        radius,
        trim: this.trimMode(db)
      })

      if (!outcome.ok) {
        this.showMessage(
          AcApI18n.t(`jig.fillet.error.${outcome.error}`),
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
          this.showMessage(AcApI18n.t('jig.fillet.eraseFailed'), 'warning')
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

  private radius(db: AcDbDatabase): number {
    return readNumberSysVar(AcDbSystemVariables.FILLETRAD, db, 0)
  }

  private trimMode(db: AcDbDatabase): boolean {
    return readNumberSysVar(AcDbSystemVariables.TRIMMODE, db, 1) !== 0
  }

  private filletPolyArc(db: AcDbDatabase): boolean {
    return readNumberSysVar(AcDbSystemVariables.FILLETPOLYARC, db, 1) !== 0
  }

  private setSysVar(name: string, value: number, db: AcDbDatabase) {
    AcDbSysVarManager.instance().setVar(name, value, db)
  }

  private async promptFirstObject(): Promise<
    | { kind: 'entity'; objectId: AcDbObjectId; pickedPoint?: AcGePoint3dLike }
    | { kind: 'keyword'; keyword: FilletKeyword }
    | 'cancel'
    | 'done'
  > {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.fillet.selectFirst')
    )
    prompt.allowNone = true
    prompt.setRejectMessage(AcApI18n.t('jig.fillet.rejectObject'))
    addFilletKeyword(prompt, 'undo')
    addFilletKeyword(prompt, 'polyline')
    addFilletKeyword(prompt, 'radius')
    addFilletKeyword(prompt, 'trim')
    addFilletKeyword(prompt, 'multiple')

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.None) return 'done'
    if (result.status === AcEdPromptStatus.Keyword) {
      return {
        kind: 'keyword',
        keyword: (result.stringResult ?? '') as FilletKeyword
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

  private async promptSecondObject(
    view: AcEdBaseView,
    db: AcDbDatabase,
    firstEntity: AcDbEntity | undefined,
    pick1: AcGePoint3dLike
  ): Promise<
    | { kind: 'entity'; objectId: AcDbObjectId; pickedPoint?: AcGePoint3dLike }
    | { kind: 'keyword'; keyword: FilletKeyword }
    | 'cancel'
  > {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.fillet.selectSecond')
    )
    prompt.setRejectMessage(AcApI18n.t('jig.fillet.rejectObject'))
    addFilletKeyword(prompt, 'radius')

    if (
      firstEntity &&
      acdbIsFilletableEntity(firstEntity) &&
      isCommandPreviewOn(db)
    ) {
      const jig = new AcApFilletPreviewJig(view, firstEntity, pick1, () =>
        this.radius(db)
      )
      jig.update({ pickedPoint: { ...view.curPos, z: 0 } })
      jig.render()
      prompt.jig = jig
    }

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.Keyword) {
      return {
        kind: 'keyword',
        keyword: (result.stringResult ?? '') as FilletKeyword
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
      AcApI18n.t('jig.fillet.selectPolyline')
    )
    prompt.addAllowedClass('Polyline')
    prompt.setRejectMessage(AcApI18n.t('jig.fillet.rejectPolyline'))
    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
      return 'cancel'
    }
    const entity = context.doc.database.openEntityForWrite(result.objectId)
    if (!(entity instanceof AcDbPolyline)) {
      this.showMessage(AcApI18n.t('jig.fillet.rejectPolyline'), 'warning')
      return 'cancel'
    }
    const db = context.doc.database
    const stats = acdbFilletPolyline(entity, {
      radius: this.radius(db),
      trim: this.trimMode(db),
      filletPolyArc: this.filletPolyArc(db)
    })
    this.showMessage(
      AcApI18n.t('jig.fillet.polylineResult')
        .replace('{filleted}', String(stats.filleted))
        .replace('{skipped}', String(stats.skipped))
    )
    return 'done'
  }

  private async promptRadius(db: AcDbDatabase): Promise<boolean> {
    const prompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.fillet.specifyRadius')
    )
    prompt.allowNegative = false
    prompt.allowZero = true
    prompt.defaultValue = this.radius(db)
    prompt.useDefaultValue = true
    prompt.allowNone = true
    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    if (result.status === AcEdPromptStatus.None) return true
    if (result.status !== AcEdPromptStatus.OK || result.value == null) {
      return false
    }
    if (!Number.isFinite(result.value) || result.value < 0) {
      this.showMessage(AcApI18n.t('jig.fillet.invalidRadius'), 'warning')
      return false
    }
    this.setSysVar(AcDbSystemVariables.FILLETRAD, result.value, db)
    return true
  }

  private async promptTrimMode(db: AcDbDatabase): Promise<boolean> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.fillet.trimPrompt')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.fillet.keywords.trimMode.display'),
      AcApI18n.t('jig.fillet.keywords.trimMode.global'),
      AcApI18n.t('jig.fillet.keywords.trimMode.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.fillet.keywords.noTrim.display'),
      AcApI18n.t('jig.fillet.keywords.noTrim.global'),
      AcApI18n.t('jig.fillet.keywords.noTrim.local')
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
}

/**
 * Transient fillet-arc preview while picking the second object (COMMANDPREVIEW).
 */
class AcApFilletPreviewJig extends AcEdPreviewJig<AcEdEntityHoverSample> {
  private readonly _view: AcEdBaseView
  private readonly _first: AcDbEntity
  private readonly _pick1: AcGePoint3dLike
  private readonly _getRadius: () => number
  private _preview: AcDbEntity[] = []
  private _renderedIds: string[] = []

  constructor(
    view: AcEdBaseView,
    first: AcDbEntity,
    pick1: AcGePoint3dLike,
    getRadius: () => number
  ) {
    super(view)
    this._view = view
    this._first = first
    this._pick1 = pick1
    this._getRadius = getRadius
  }

  update(sample: AcEdEntityHoverSample) {
    this.clearRendered()
    this._preview = []
    if (!sample.objectId) return
    const second = AcApDocManager.instance.curDocument?.database.getObjectById(
      sample.objectId
    ) as AcDbEntity | undefined
    if (!second || !acdbIsFilletableEntity(second)) return
    const radius = AcApDocManager.instance.editor.getInputModifiers().shiftKey
      ? 0
      : this._getRadius()
    this._preview = acdbPreviewFilletTwoEntities(
      this._first,
      this._pick1,
      second,
      sample.pickedPoint,
      { radius }
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

function addFilletKeyword(
  prompt: AcEdPromptEntityOptions,
  key: 'undo' | 'polyline' | 'radius' | 'trim' | 'multiple'
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.fillet.keywords.${key}.display`),
    AcApI18n.t(`jig.fillet.keywords.${key}.global`),
    AcApI18n.t(`jig.fillet.keywords.${key}.local`)
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
