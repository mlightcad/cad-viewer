import {
  AcCmColor,
  AcDbBlockTableRecord,
  AcDbCurve,
  AcDbDatabase,
  AcDbEntity,
  AcDbHatch,
  AcDbObjectId,
  AcGeBox2d,
  AcGePlane,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d
} from '@mlightcad/data-model'

import type { AcApContext } from '../../app/AcApContext.js'
import { AcEdCommand } from '../../editor/command/AcEdCommand.js'
import { AcEdPromptBoxOptions } from '../../editor/input/prompt/AcEdPromptBoxOptions.js'
import { AcEdPromptEntityOptions } from '../../editor/input/prompt/AcEdPromptEntityOptions.js'
import { AcEdPromptKeywordOptions } from '../../editor/input/prompt/AcEdPromptKeywordOptions.js'
import { AcEdPromptPointOptions } from '../../editor/input/prompt/AcEdPromptPointOptions.js'
import { AcEdPromptSelectionOptions } from '../../editor/input/prompt/AcEdPromptSelectionOptions.js'
import { AcEdPromptStatus } from '../../editor/input/prompt/AcEdPromptStatus.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'
import { isEntityOnLockedLayer } from '../../service/AcApLockedLayer.js'
import { AcApUcsService } from '../../service/AcApUcsService.js'
import {
  acapComputeExtend,
  acapComputeExtendAtEnd,
  acapComputeTrim,
  acapComputeTrimPieces,
  acapCrossingPickPoint,
  acapExtendEndNearPick,
  AcApExtendResult,
  acapFencePickPoints,
  acapIsTrimExtendCurve,
  acapResolveTrim,
  AcApTrimExtendGeomOptions,
  AcApTrimPieces
} from './acapTrimExtend.js'
import {
  acapGetTrimExtendSysVar,
  acapSetTrimExtendSysVar
} from './AcApTrimExtendSysVars.js'

/**
 * Upper bound of how far a tessellated curve (and so its spatial-index box)
 * can lie inside the true curve, relative to the curve size: the chord
 * height `r * (1 - cos(PI / n))` at the coarsest circle tessellation
 * (8 sides, ~0.076 r), rounded up.
 */
const MAX_CHORD_HEIGHT_RATIO = 0.08

/** True when the exact extents of `entity` overlap `box` (or are unknown). */
function extentsTouch(entity: AcDbEntity, box: AcGeBox2d) {
  const extents = entity.geometricExtents
  if (!extents || extents.isEmpty()) return true
  return !(
    extents.max.x < box.min.x ||
    extents.min.x > box.max.x ||
    extents.max.y < box.min.y ||
    extents.min.y > box.max.y
  )
}

/** Which operation a pick performs. Shift-pick swaps it. */
export type AcApTrimExtendOp = 'trim' | 'extend'

/** AutoCAD `TRIMEXTENDMODE`: 1 = Quick (default), 0 = Standard. */
export type AcApTrimExtendMode = 'quick' | 'standard'

/** AutoCAD `PROJMODE`: 0 = None, 1 = UCS (default), 2 = View. */
export type AcApTrimExtendProject = 'none' | 'ucs' | 'view'

/**
 * TRIM / EXTEND options. Each one is an AutoCAD system variable, so the
 * command options, SETVAR and typing the variable name all change the same
 * value: `TRIMEXTENDMODE` (`mode`), `PROJMODE` (`project`), `EDGEMODE`
 * (`extendEdges`) and `TRIMEDGES` (`hatchEdgesOnly`).
 */
export interface AcApTrimExtendSettings {
  mode: AcApTrimExtendMode
  project: AcApTrimExtendProject
  /** AutoCAD `EDGEMODE = 1`: edges are treated as extended (Standard mode). */
  extendEdges: boolean
  /**
   * AutoCAD `TRIMEDGES = 1` (default): in Quick mode a hatch is an edge only
   * through its boundary. `TRIMEDGES = 0`: its pattern lines are edges too.
   */
  hatchEdgesOnly: boolean
  /**
   * AutoCAD `COMMANDPREVIEW = 1` (default): hovering shows what a pick would
   * trim away / extend to. `COMMANDPREVIEW = 0`: no hover preview.
   */
  readonly commandPreview: boolean
}

const PROJECT_VALUES: AcApTrimExtendProject[] = ['none', 'ucs', 'view']

/** {@link AcApTrimExtendSettings} read from / written to system variables. */
class AcApTrimExtendSysVarSettings implements AcApTrimExtendSettings {
  constructor(private readonly db: AcDbDatabase) {}

  get mode(): AcApTrimExtendMode {
    return acapGetTrimExtendSysVar('TRIMEXTENDMODE', this.db) === 0
      ? 'standard'
      : 'quick'
  }

  set mode(value: AcApTrimExtendMode) {
    acapSetTrimExtendSysVar(
      'TRIMEXTENDMODE',
      value === 'quick' ? 1 : 0,
      this.db
    )
  }

  get project(): AcApTrimExtendProject {
    return PROJECT_VALUES[acapGetTrimExtendSysVar('PROJMODE', this.db)]
  }

  set project(value: AcApTrimExtendProject) {
    acapSetTrimExtendSysVar('PROJMODE', PROJECT_VALUES.indexOf(value), this.db)
  }

  get extendEdges(): boolean {
    return acapGetTrimExtendSysVar('EDGEMODE', this.db) === 1
  }

  set extendEdges(value: boolean) {
    acapSetTrimExtendSysVar('EDGEMODE', value ? 1 : 0, this.db)
  }

  get hatchEdgesOnly(): boolean {
    return acapGetTrimExtendSysVar('TRIMEDGES', this.db) === 1
  }

  get commandPreview(): boolean {
    return acapGetTrimExtendSysVar('COMMANDPREVIEW', this.db) !== 0
  }

  set hatchEdgesOnly(value: boolean) {
    acapSetTrimExtendSysVar('TRIMEDGES', value ? 1 : 0, this.db)
  }
}

/** One undoable pick: the entities it appended, erased and modified. */
interface TrimExtendStep {
  appended: AcDbEntity[]
  erased: AcDbEntity[]
  modified: AcDbEntity[]
}

/** A pick to process: target entity id and WCS pick point. */
interface TrimExtendPick {
  id: AcDbObjectId
  point: AcGePoint3dLike
}

/** ACI color used to draw the part TRIM would remove while hovering. */
const PREVIEW_TRIM_COLOR_INDEX = 8

/**
 * Shared implementation of AutoCAD-style TRIM and EXTEND.
 *
 * Both commands run the same pick loop and only differ in their primary
 * operation; shift-pick performs the other one, as in AutoCAD.
 *
 * - **Quick mode** (default): every visible object is a cutting / boundary
 *   edge; TRIM deletes a picked object that no edge cuts.
 * - **Standard mode**: the user selects the edges first (Enter = all), and the
 *   Edge option decides whether edges are treated as extended.
 * - Options: cutting/boundary edges, Fence, Crossing, mOde, Project, Edge,
 *   eRase (TRIM only), Undo.
 *
 * Geometry comes from the data model: `AcDbEntity.intersectWith`,
 * `AcDbCurve.getSplitCurves` (TRIM) and `AcDbCurve.extendToPoint` (EXTEND),
 * wrapped by the UI-free helpers in `acapTrimExtend.ts`.
 *
 * Every pick runs in its own nested transaction so the Undo option can roll
 * back just that pick; all of them merge into the command's outer
 * transaction on exit, so the whole command is one UNDO step.
 */
export abstract class AcApTrimExtendCmd extends AcEdCommand {
  /**
   * Options shared by TRIM and EXTEND, backed by the `TRIMEXTENDMODE`,
   * `PROJMODE`, `EDGEMODE` and `TRIMEDGES` system variables. They are not
   * stored in the drawing, so their values carry over between documents.
   *
   * @param db - Database whose active transaction records option changes
   */
  static getSettings(db: AcDbDatabase): AcApTrimExtendSettings {
    return new AcApTrimExtendSysVarSettings(db)
  }

  /** The operation a plain (non-shift) pick performs. */
  protected abstract readonly primaryOp: AcApTrimExtendOp

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const session = new AcApTrimExtendSession(
      context,
      this.primaryOp,
      (message, type) => this.showMessage(message, type)
    )
    await session.run()
  }
}

type ShowMessage = (message: string, type?: 'info' | 'warning') => void

/**
 * State of one TRIM / EXTEND run: edge set, undo steps, hover preview.
 */
class AcApTrimExtendSession {
  private readonly settings: AcApTrimExtendSettings
  /** `TRIMEDGES = 0`: pattern lines of each hatch, built on first use. */
  private readonly hatchPatternEdges = new Map<AcDbObjectId, AcDbEntity[]>()
  /** Standard-mode edges; `undefined` means every object (Quick / select all). */
  private edgeIds?: Set<AcDbObjectId>
  private readonly steps: TrimExtendStep[] = []
  /** Pick-independent hover results; cleared whenever the drawing changes. */
  private readonly trimCache = new Map<AcDbObjectId, AcApTrimPieces>()
  private readonly extendCache = new Map<string, AcApExtendResult>()
  private previewIds: AcDbObjectId[] = []
  private previewFrame = 0
  /**
   * Shift state. Tracked here because entity prompts do not record modifier
   * keys; mouse events carry it too, so a held Shift is seen even when the
   * key went down before the command started.
   */
  private shiftDown = false
  /** True while the main pick prompt is waiting for input. */
  private previewActive = false

  constructor(
    private readonly context: AcApContext,
    private readonly primaryOp: AcApTrimExtendOp,
    private readonly notify: ShowMessage
  ) {
    this.settings = AcApTrimExtendCmd.getSettings(context.doc.database)
  }

  private get view() {
    return this.context.view
  }

  private get editor() {
    return this.context.view.editor
  }

  private get db() {
    return this.context.doc.database
  }

  private get tm() {
    return this.db.transactionManager
  }

  private t(key: string) {
    return AcApI18n.t(key)
  }

  /** Runs the pick loop until Enter / Escape, then merges all picks. */
  async run() {
    let failed = false
    const stopShiftTracking = this.trackShiftKey()
    try {
      this.showCurrentSettings()
      if (this.settings.mode === 'standard') {
        if (!(await this.selectEdges())) return
      }
      await this.pickLoop()
    } catch (error) {
      failed = true
      throw error
    } finally {
      stopShiftTracking()
      this.clearPreview()
      this.finishSteps(failed)
    }
  }

  private trackShiftKey(): () => void {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey === this.shiftDown) return
      this.shiftDown = e.shiftKey
      this.schedulePreview()
    }
    const onPointer = (e: MouseEvent) => {
      this.shiftDown = e.shiftKey
    }
    const canvas = this.view.canvas
    document.addEventListener('keydown', onKey)
    document.addEventListener('keyup', onKey)
    // Capture phase: record Shift before the prompt's click handler resolves.
    canvas.addEventListener('mousedown', onPointer, true)
    canvas.addEventListener('mousemove', onPointer, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keyup', onKey)
      canvas.removeEventListener('mousedown', onPointer, true)
      canvas.removeEventListener('mousemove', onPointer, true)
    }
  }

  private showCurrentSettings() {
    const { project, extendEdges, mode } = this.settings
    const message = this.t('jig.trimExtend.currentSettings')
      .replace('{projection}', this.t(`jig.trimExtend.settingValue.${project}`))
      .replace(
        '{edge}',
        this.t(
          `jig.trimExtend.settingValue.${extendEdges ? 'extend' : 'noExtend'}`
        )
      )
      .replace('{mode}', this.t(`jig.trimExtend.settingValue.${mode}`))
    this.notify(message)
  }

  private async pickLoop() {
    for (;;) {
      const prompt = this.buildPickPrompt()
      const stopPreview = this.startHoverPreview()
      let result
      try {
        result = await this.editor.getEntity(prompt)
      } finally {
        stopPreview()
      }

      if (result.status === AcEdPromptStatus.OK && result.objectId) {
        const op = this.opForModifiers()
        const cursor = this.view.curPos
        const point = result.pickedPoint ?? { x: cursor.x, y: cursor.y, z: 0 }
        this.runStep(op, [{ id: result.objectId, point }])
        continue
      }
      if (result.status !== AcEdPromptStatus.Keyword) return
      const keep = await this.handleKeyword(result.stringResult)
      if (!keep) return
    }
  }

  /** Main prompt: "Select object to trim or shift-select to extend or [...]" */
  private buildPickPrompt() {
    const prompt = new AcEdPromptEntityOptions(
      this.t(`jig.${this.primaryOp}.selectObject`)
    )
    prompt.allowNone = true
    // Locked objects are reported by this command with a specific message.
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(this.t('jig.trimExtend.noObject'))
    const standard = this.settings.mode === 'standard'
    const keys: string[] = [
      this.primaryOp === 'trim' ? 'cuttingEdges' : 'boundaryEdges',
      'fence',
      'crossing',
      'mode',
      'project'
    ]
    if (standard) keys.push('edge')
    if (this.primaryOp === 'trim') keys.push('erase')
    if (this.steps.length > 0) keys.push('undo')
    keys.forEach(key => this.addKeyword(prompt, key))
    return prompt
  }

  private addKeyword(
    prompt: { keywords: AcEdPromptEntityOptions['keywords'] },
    key: string
  ) {
    return prompt.keywords.add(
      this.t(`jig.trimExtend.keywords.${key}.display`),
      this.t(`jig.trimExtend.keywords.${key}.global`),
      this.t(`jig.trimExtend.keywords.${key}.local`)
    )
  }

  /** Shift swaps TRIM and EXTEND for one pick, as in AutoCAD. */
  private opForModifiers(): AcApTrimExtendOp {
    if (!this.shiftDown) return this.primaryOp
    return this.primaryOp === 'trim' ? 'extend' : 'trim'
  }

  /** @returns `false` to end the command. */
  private async handleKeyword(keyword: string | undefined): Promise<boolean> {
    switch (keyword) {
      case this.globalOf('cuttingEdges'):
      case this.globalOf('boundaryEdges'):
        // AutoCAD switches to Standard mode when edges are chosen explicitly.
        this.settings.mode = 'standard'
        return this.selectEdges()
      case this.globalOf('fence'):
        await this.runFence()
        return true
      case this.globalOf('crossing'):
        await this.runCrossing()
        return true
      case this.globalOf('mode'):
        return this.chooseMode()
      case this.globalOf('project'):
        await this.chooseProject()
        return true
      case this.globalOf('edge'):
        await this.chooseEdge()
        return true
      case this.globalOf('erase'):
        await this.runErase()
        return true
      case this.globalOf('undo'):
        this.undoStep()
        return true
      default:
        return true
    }
  }

  private globalOf(key: string) {
    return this.t(`jig.trimExtend.keywords.${key}.global`)
  }

  /**
   * Standard mode: selects cutting / boundary edges. Enter selects all.
   *
   * @returns `false` when the user cancelled.
   */
  private async selectEdges(): Promise<boolean> {
    const options = new AcEdPromptSelectionOptions(
      this.t(`jig.${this.primaryOp}.selectEdges`)
    )
    options.allowObjectOnLockedLayer = true
    const result = await this.editor.getSelection(options)
    if (result.status === AcEdPromptStatus.Cancel) return false
    const ids = result.value?.ids ?? []
    this.edgeIds = ids.length > 0 ? new Set(ids) : undefined
    this.view.selectionSet.clear()
    this.clearCaches()
    return true
  }

  private async chooseMode(): Promise<boolean> {
    const prompt = new AcEdPromptKeywordOptions(
      this.t(`jig.${this.primaryOp}.modePrompt`)
    )
    const quick = this.addKeyword(prompt, 'quick')
    const standard = this.addKeyword(prompt, 'standard')
    prompt.keywords.default = this.settings.mode === 'quick' ? quick : standard
    const result = await this.editor.getKeywords(prompt)
    const chosen = this.resolveKeywordChoice(result, prompt)
    if (chosen === this.globalOf('quick')) {
      this.settings.mode = 'quick'
      this.edgeIds = undefined
      this.clearCaches()
    } else if (chosen === this.globalOf('standard')) {
      this.settings.mode = 'standard'
      return this.selectEdges()
    }
    return true
  }

  private async chooseProject() {
    const prompt = new AcEdPromptKeywordOptions(
      this.t('jig.trimExtend.projectPrompt')
    )
    const values = PROJECT_VALUES
    const keys = values.map(value =>
      this.addKeyword(prompt, `project${capitalize(value)}`)
    )
    prompt.keywords.default = keys[values.indexOf(this.settings.project)]
    const result = await this.editor.getKeywords(prompt)
    const chosen = this.resolveKeywordChoice(result, prompt)
    const index = keys.findIndex(key => key.globalName === chosen)
    if (index >= 0) {
      this.settings.project = values[index]
      this.clearCaches()
    }
  }

  private async chooseEdge() {
    const prompt = new AcEdPromptKeywordOptions(
      this.t('jig.trimExtend.edgePrompt')
    )
    const extend = this.addKeyword(prompt, 'edgeExtend')
    const noExtend = this.addKeyword(prompt, 'edgeNoExtend')
    prompt.keywords.default = this.settings.extendEdges ? extend : noExtend
    const result = await this.editor.getKeywords(prompt)
    const chosen = this.resolveKeywordChoice(result, prompt)
    if (chosen === extend.globalName) this.settings.extendEdges = true
    if (chosen === noExtend.globalName) this.settings.extendEdges = false
    this.clearCaches()
  }

  /** Keyword prompt result → global name; Enter picks the default. */
  private resolveKeywordChoice(
    result: { status: AcEdPromptStatus; stringResult?: string },
    prompt: AcEdPromptKeywordOptions
  ): string | undefined {
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      return result.stringResult ?? prompt.keywords.default?.globalName
    }
    if (result.status === AcEdPromptStatus.None) {
      return prompt.keywords.default?.globalName
    }
    return undefined
  }

  /** Fence: every object crossing the fence is picked where it crosses. */
  private async runFence() {
    const fence: AcGePoint3d[] = []
    for (;;) {
      const first = fence.length === 0
      const prompt = new AcEdPromptPointOptions(
        this.t(`jig.trimExtend.${first ? 'fenceFirst' : 'fenceNext'}`)
      )
      prompt.allowNone = !first
      if (!first) {
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = fence[fence.length - 1]
      }
      const result = await this.editor.getPoint(prompt)
      if (result.status !== AcEdPromptStatus.OK || !result.value) break
      fence.push(
        new AcGePoint3d(result.value.x, result.value.y, result.value.z ?? 0)
      )
    }
    if (fence.length < 2) return

    const box = new AcGeBox2d()
    fence.forEach(p => box.expandByPoint({ x: p.x, y: p.y }))
    const picks: TrimExtendPick[] = []
    for (const curve of this.searchCurves(box)) {
      acapFencePickPoints(curve, fence).forEach(point =>
        picks.push({ id: curve.objectId, point })
      )
    }
    this.runStep(this.primaryOp, picks)
  }

  /** Crossing: every object in or crossing the box is picked once. */
  private async runCrossing() {
    const options = new AcEdPromptBoxOptions(
      this.t('jig.trimExtend.crossingFirst'),
      this.t('jig.trimExtend.crossingSecond')
    )
    const result = await this.editor.getBox(options)
    if (result.status !== AcEdPromptStatus.OK || !result.value) return
    const box = result.value
    const picks: TrimExtendPick[] = []
    for (const curve of this.searchCurves(box)) {
      const point = acapCrossingPickPoint(curve, box)
      if (point) picks.push({ id: curve.objectId, point })
    }
    this.runStep(this.primaryOp, picks)
  }

  /** TRIM eRase option: deletes selected objects as one undoable step. */
  private async runErase() {
    const options = new AcEdPromptSelectionOptions(
      this.t('jig.trimExtend.erasePrompt')
    )
    const result = await this.editor.getSelection(options)
    const ids = result.value?.ids ?? []
    this.view.selectionSet.clear()
    if (result.status !== AcEdPromptStatus.OK || ids.length === 0) return
    const step = this.beginStep()
    try {
      for (const id of ids) {
        const entity = this.getEntity(id)
        if (!entity || isEntityOnLockedLayer(this.db, entity)) continue
        this.eraseEntity(entity, step)
      }
    } finally {
      this.endStep(step)
    }
  }

  /** Visible, unlocked curves whose extents touch `box`. */
  private searchCurves(box: AcGeBox2d): AcDbCurve[] {
    const curves: AcDbCurve[] = []
    for (const item of this.view.search(box)) {
      const entity = this.getEntity(item.id)
      if (!acapIsTrimExtendCurve(entity)) continue
      if (isEntityOnLockedLayer(this.db, entity)) continue
      curves.push(entity)
    }
    return curves
  }

  // ---------------------------------------------------------------------
  // Steps (picks) and undo
  // ---------------------------------------------------------------------

  /** Opens a nested transaction for one undoable pick. */
  private beginStep(): TrimExtendStep {
    this.tm.startTransaction()
    return { appended: [], erased: [], modified: [] }
  }

  /** Keeps a step that changed something; aborts an empty one. */
  private endStep(step: TrimExtendStep) {
    const changed =
      step.appended.length + step.erased.length + step.modified.length > 0
    if (changed) {
      this.steps.push(step)
    } else {
      this.tm.abortTransaction()
    }
    this.clearCaches()
  }

  /**
   * Applies `op` to each pick as one undoable step. Picks on an object that
   * an earlier pick of the same step split are redirected to the piece that
   * now lies under the pick point.
   */
  private runStep(op: AcApTrimExtendOp, picks: TrimExtendPick[]) {
    if (picks.length === 0) return
    this.clearPreview()
    const step = this.beginStep()
    // Original id -> pieces it was split into during this step.
    const replaced = new Map<AcDbObjectId, AcDbCurve[]>()
    const report = picks.length === 1
    try {
      for (const pick of picks) {
        const target = this.resolvePickTarget(pick, replaced)
        if (!target) continue
        if (op === 'trim') {
          this.trimOne(target, pick.point, step, replaced, report)
        } else {
          this.extendOne(target, pick.point, step, report)
        }
      }
    } finally {
      this.endStep(step)
    }
  }

  private resolvePickTarget(
    pick: TrimExtendPick,
    replaced: Map<AcDbObjectId, AcDbCurve[]>
  ): AcDbEntity | undefined {
    let pieces = replaced.get(pick.id)
    if (!pieces) return this.getEntity(pick.id)
    // Follow chains of splits within one step.
    for (;;) {
      let best: AcDbCurve | undefined
      let bestDist = Infinity
      for (const piece of pieces) {
        const closest = piece.getClosestPointTo(pick.point)
        if (!closest) continue
        const dist = closest.distanceTo(pick.point)
        if (dist < bestDist) {
          bestDist = dist
          best = piece
        }
      }
      if (!best) return undefined
      const next = replaced.get(best.objectId)
      if (!next) return best
      pieces = next
    }
  }

  private trimOne(
    target: AcDbEntity,
    pickPoint: AcGePoint3dLike,
    step: TrimExtendStep,
    replaced: Map<AcDbObjectId, AcDbCurve[]>,
    report: boolean
  ) {
    if (!this.checkEditable(target, 'trim', report)) return
    const curve = target as AcDbCurve
    const result = acapComputeTrim(
      curve,
      pickPoint,
      this.edgesFor(curve, 'trim'),
      {
        ...this.geomOptions(),
        eraseWhenUncut: this.settings.mode === 'quick'
      }
    )
    if (result.kind === 'none') {
      if (report) {
        this.notify(this.t('jig.trimExtend.noIntersection'), 'warning')
      }
      return
    }
    const wasEdge = this.edgeIds?.has(curve.objectId) ?? false
    if (result.kind === 'split') {
      const space = this.resolveOwnerSpace(curve.ownerId)
      for (const piece of result.keep) {
        space.appendEntity(piece)
        step.appended.push(piece)
        if (wasEdge) this.edgeIds?.add(piece.objectId)
      }
      this.view.addEntity(result.keep)
      replaced.set(curve.objectId, result.keep)
    }
    this.eraseEntity(curve, step)
  }

  private extendOne(
    target: AcDbEntity,
    pickPoint: AcGePoint3dLike,
    step: TrimExtendStep,
    report: boolean
  ) {
    if (!this.checkEditable(target, 'extend', report)) return
    const curve = target as AcDbCurve
    const result = curve.closed
      ? ({ kind: 'none' } as const)
      : acapComputeExtend(
          curve,
          pickPoint,
          this.edgesFor(curve, 'extend'),
          this.geomOptions()
        )
    if (result.kind === 'none') {
      if (report) {
        this.notify(
          this.t(
            curve.closed
              ? 'jig.trimExtend.cannotExtend'
              : 'jig.trimExtend.noEdgeInDirection'
          ),
          'warning'
        )
      }
      return
    }
    const writable = this.db.openEntityForWrite(curve) as AcDbCurve | undefined
    if (!writable || !writable.extendToPoint(result.atStart, result.point)) {
      if (report) this.notify(this.t('jig.trimExtend.cannotExtend'), 'warning')
      return
    }
    step.modified.push(writable)
    this.view.updateEntity(writable)
  }

  /** Curve check + locked-layer check, with AutoCAD-like messages. */
  private checkEditable(
    entity: AcDbEntity,
    op: AcApTrimExtendOp,
    report: boolean
  ): boolean {
    if (!acapIsTrimExtendCurve(entity)) {
      if (report) {
        this.notify(
          this.t(
            op === 'trim'
              ? 'jig.trimExtend.cannotTrim'
              : 'jig.trimExtend.cannotExtend'
          ),
          'warning'
        )
      }
      return false
    }
    if (isEntityOnLockedLayer(this.db, entity)) {
      if (report) this.notify(this.t('jig.trimExtend.lockedLayer'), 'warning')
      return false
    }
    return true
  }

  private eraseEntity(entity: AcDbEntity, step: TrimExtendStep) {
    const erased = this.context.doc.entityService.eraseEntities([
      entity.objectId
    ])
    if (erased === 0) return
    step.erased.push(entity)
    if (this.view.hasEntity(entity.objectId)) this.view.removeEntity(entity)
  }

  /** Undo option: rolls back the most recent pick only. */
  private undoStep() {
    const step = this.steps.pop()
    if (!step) {
      this.notify(this.t('jig.trimExtend.nothingToUndo'), 'warning')
      return
    }
    this.clearPreview()
    this.tm.abortTransaction()
    // Pick-level changes are only announced on the outer commit, so the
    // view is synced by hand (guarded, in case the rollback announced them).
    const removeIds = step.appended.filter(entity =>
      this.view.hasEntity(entity.objectId)
    )
    if (removeIds.length > 0) this.view.removeEntity(removeIds)
    const restored = step.erased
      .map(entity => this.getEntity(entity.objectId) ?? entity)
      .filter(entity => !this.view.hasEntity(entity.objectId))
    if (restored.length > 0) this.view.addEntity(restored)
    const modified = step.modified
      .map(entity => this.getEntity(entity.objectId))
      .filter((entity): entity is AcDbEntity => !!entity)
    if (modified.length > 0) this.view.updateEntity(modified)
    if (this.edgeIds) {
      step.appended.forEach(entity => this.edgeIds?.delete(entity.objectId))
    }
    this.clearCaches()
  }

  /** Commits every kept pick into the command transaction (or aborts all). */
  private finishSteps(failed: boolean) {
    while (this.steps.length > 0) {
      this.steps.pop()
      if (failed) {
        this.tm.abortTransaction()
      } else {
        this.tm.commitTransaction()
      }
    }
  }

  // ---------------------------------------------------------------------
  // Edges and geometry options
  // ---------------------------------------------------------------------

  /**
   * Edges used for `target`. Quick mode / select-all uses every visible
   * object the spatial index returns near the target (TRIM) or anywhere in
   * the drawing (EXTEND, which may reach far-away boundaries).
   */
  private edgesFor(target: AcDbCurve, op: AcApTrimExtendOp): AcDbEntity[] {
    if (this.edgeIds) {
      const edges: AcDbEntity[] = []
      this.edgeIds.forEach(id => {
        const entity = this.getEntity(id)
        if (entity && entity !== target) edges.push(entity)
      })
      return edges
    }
    const box = this.edgeSearchBox(target, op)
    if (!box) return []
    const exact = box.wholeDrawing ? undefined : box.exact
    // TRIMEDGES only affects Quick mode, as in AutoCAD.
    const patternEdges =
      this.settings.mode === 'quick' && !this.settings.hatchEdgesOnly
    const edges: AcDbEntity[] = []
    for (const item of this.view.search(box.query)) {
      if (item.id === target.objectId) continue
      const entity = this.getEntity(item.id)
      if (!entity || !this.isEdgeVisible(entity)) continue
      if (exact && !extentsTouch(entity, exact)) continue
      edges.push(entity)
      if (patternEdges && entity instanceof AcDbHatch) {
        edges.push(...this.patternEdgesOf(entity))
      }
    }
    return edges
  }

  /**
   * `TRIMEDGES = 0`: the pattern lines of `hatch` as transient edges, the
   * same lines EXPLODE would produce. Solid / gradient hatches have none.
   */
  private patternEdgesOf(hatch: AcDbHatch): AcDbEntity[] {
    let lines = this.hatchPatternEdges.get(hatch.objectId)
    if (!lines) {
      try {
        lines = hatch.explode()
      } catch {
        lines = []
      }
      this.hatchPatternEdges.set(hatch.objectId, lines)
    }
    return lines
  }

  /**
   * Spatial-index query for the edges of `target`.
   *
   * The index stores the boxes of the *tessellated* curves, which lie inside
   * the true curve by up to the chord height. A line touching a circle at
   * its lowest point (a tangent) then misses the circle's index box, so the
   * circle was not used as a cutting edge and Quick-mode TRIM erased the
   * whole line. `query` is therefore widened by the worst chord height,
   * and `exact` (the target's true extents) filters the candidates again by
   * their exact `geometricExtents`.
   */
  private edgeSearchBox(
    target: AcDbCurve,
    op: AcApTrimExtendOp
  ): { query: AcGeBox2d; exact: AcGeBox2d; wholeDrawing: boolean } | undefined {
    const extents = target.geometricExtents
    const exact = new AcGeBox2d()
    if (extents && !extents.isEmpty()) {
      exact.expandByPoint({ x: extents.min.x, y: extents.min.y })
      exact.expandByPoint({ x: extents.max.x, y: extents.max.y })
    }
    if (exact.isEmpty()) return undefined
    const query = exact.clone()
    const drawing = this.view.getDrawingExtents()
    const hasDrawing = !!drawing && !drawing.isEmpty()
    // EXTEND and extended edges (EDGEMODE) can meet far-away objects.
    const wholeDrawing = op === 'extend' || this.settings.extendEdges
    if (wholeDrawing && hasDrawing) query.union(drawing)
    const size = (box: { min: AcGePoint2dLike; max: AcGePoint2dLike }) =>
      Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
    // No curve is larger than the drawing, so this bounds every edge's
    // tessellation shrinkage; never less than a relative point tolerance.
    const pad = Math.max(
      size(query) * 1e-6,
      hasDrawing ? size(drawing) * MAX_CHORD_HEIGHT_RATIO : 0,
      1e-6
    )
    exact.expandByScalar(Math.max(size(exact), 1) * 1e-6)
    return { query: query.expandByScalar(pad), exact, wholeDrawing }
  }

  private isEdgeVisible(entity: AcDbEntity): boolean {
    if (entity.visibility === false) return false
    const layer = this.db.tables.layerTable.getAt(entity.layer)
    if (!layer) return true
    return !layer.isOff && !layer.isFrozen
  }

  /** Projection plane for the current `project` setting. */
  private geomOptions(): AcApTrimExtendGeomOptions {
    const options: AcApTrimExtendGeomOptions = {
      extendEdges:
        this.settings.mode === 'standard' && this.settings.extendEdges
    }
    if (this.settings.project === 'none') return options
    const plane = new AcGePlane()
    if (this.settings.project === 'ucs') {
      const frame = AcApUcsService.getActiveFrame(this.db)
      const normal = new AcGeVector3d(frame.xAxis)
        .cross(new AcGeVector3d(frame.yAxis))
        .normalize()
      plane.setFromNormalAndCoplanarPoint(
        normal,
        new AcGeVector3d(frame.origin)
      )
    } else {
      // The 2D view always looks down the WCS Z axis.
      plane.setFromNormalAndCoplanarPoint(
        new AcGeVector3d(0, 0, 1),
        new AcGeVector3d(0, 0, 0)
      )
    }
    options.projPlane = plane
    return options
  }

  private getEntity(id: AcDbObjectId): AcDbEntity | undefined {
    return this.db.tables.blockTable.getEntityById(id) ?? undefined
  }

  private resolveOwnerSpace(ownerId: AcDbObjectId): AcDbBlockTableRecord {
    const owner = this.db.getObjectById(ownerId)
    if (owner instanceof AcDbBlockTableRecord) return owner
    return this.db.tables.blockTable.modelSpace
  }

  // ---------------------------------------------------------------------
  // Hover preview
  // ---------------------------------------------------------------------

  /**
   * Shows what a pick under the cursor would do: the part TRIM removes in
   * gray, or the object EXTEND would produce. Disabled by
   * `COMMANDPREVIEW = 0`. Returns a disposer.
   */
  private startHoverPreview(): () => void {
    const listener = () => this.schedulePreview()
    this.previewActive = true
    this.view.events.mouseMove.addEventListener(listener)
    return () => {
      this.previewActive = false
      this.view.events.mouseMove.removeEventListener(listener)
      if (this.previewFrame) {
        cancelAnimationFrame(this.previewFrame)
        this.previewFrame = 0
      }
      this.clearPreview()
    }
  }

  /** Coalesces preview refreshes to one per animation frame. */
  private schedulePreview() {
    if (!this.previewActive || this.previewFrame) return
    this.previewFrame = requestAnimationFrame(() => {
      this.previewFrame = 0
      if (this.previewActive) this.updatePreview()
    })
  }

  private updatePreview() {
    this.clearPreview()
    // Read per frame so a COMMANDPREVIEW change applies immediately.
    if (!this.settings.commandPreview) return
    const pos = this.view.curPos
    const picked = this.view.pick({ x: pos.x, y: pos.y }, undefined, true)
    if (picked.length === 0) return
    const entity = this.getEntity(picked[0].id)
    if (!acapIsTrimExtendCurve(entity)) return
    if (isEntityOnLockedLayer(this.db, entity)) return
    const point = { x: pos.x, y: pos.y, z: 0 }
    const preview =
      this.opForModifiers() === 'trim'
        ? this.trimPreview(entity, point)
        : this.extendPreview(entity, point)
    if (!preview) return
    this.view.addTransientEntity(preview)
    this.previewIds = [preview.objectId]
  }

  private trimPreview(
    curve: AcDbCurve,
    point: AcGePoint3dLike
  ): AcDbCurve | undefined {
    let pieces = this.trimCache.get(curve.objectId)
    if (!pieces) {
      pieces = acapComputeTrimPieces(
        curve,
        this.edgesFor(curve, 'trim'),
        this.geomOptions()
      )
      this.trimCache.set(curve.objectId, pieces)
    }
    const result = acapResolveTrim(
      pieces,
      point,
      this.settings.mode === 'quick'
    )
    if (result.kind === 'none') return undefined
    // Clone so cached pieces keep their own color for a later commit.
    const removed = (
      result.kind === 'split' ? result.removed : curve
    ).clone() as AcDbCurve
    const color = new AcCmColor()
    color.colorIndex = PREVIEW_TRIM_COLOR_INDEX
    removed.color = color
    return removed
  }

  private extendPreview(
    curve: AcDbCurve,
    point: AcGePoint3dLike
  ): AcDbCurve | undefined {
    if (curve.closed) return undefined
    const atStart = acapExtendEndNearPick(curve, point)
    if (atStart == null) return undefined
    const key = `${curve.objectId}:${atStart ? 'start' : 'end'}`
    let result = this.extendCache.get(key)
    if (!result) {
      result = acapComputeExtendAtEnd(
        curve,
        atStart,
        this.edgesFor(curve, 'extend'),
        this.geomOptions()
      )
      this.extendCache.set(key, result)
    }
    return result.kind === 'extend' ? result.preview : undefined
  }

  private clearCaches() {
    this.trimCache.clear()
    this.extendCache.clear()
    this.hatchPatternEdges.clear()
  }

  private clearPreview() {
    this.previewIds.forEach(id => this.view.removeTransientEntity(id))
    this.previewIds = []
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
