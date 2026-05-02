import {
  AcApContext,
  AcApDocManager,
  AcApHatchCmd,
  AcApI18n,
  AcEdPromptEntityOptions,
  AcEdPromptStatus,
  type HatchSettings
} from '@mlightcad/cad-simple-viewer'
import { AcDbHatchStyle } from '@mlightcad/data-model'
import { reactive } from 'vue'

export type HatchRibbonStyle = 'Normal' | 'Outer' | 'Ignore'

export interface HatchRibbonState {
  patternName: string
  patternScale: number
  patternAngle: number
  style: HatchRibbonStyle
  associative: boolean
}

type HatchRibbonAction = 'pickPoints' | 'selectObjects' | 'close'

const DEFAULT_HATCH_RIBBON_STATE: HatchRibbonState = {
  patternName: 'ANSI31',
  patternScale: 1,
  patternAngle: 0,
  style: 'Normal',
  associative: true
}

export class AcApHatchRibbonCmd extends AcApHatchCmd {
  private readonly _state = reactive<HatchRibbonState>({
    ...DEFAULT_HATCH_RIBBON_STATE
  })

  private readonly _settings: HatchSettings = {
    patternName: DEFAULT_HATCH_RIBBON_STATE.patternName,
    patternScale: DEFAULT_HATCH_RIBBON_STATE.patternScale,
    patternAngleDeg: DEFAULT_HATCH_RIBBON_STATE.patternAngle,
    style: AcDbHatchStyle.Normal,
    associative: DEFAULT_HATCH_RIBBON_STATE.associative
  }

  private _isActive = false
  private _queuedAction: HatchRibbonAction | undefined

  get state(): Readonly<HatchRibbonState> {
    return this._state
  }

  get isActive() {
    return this._isActive
  }

  protected override get settings(): HatchSettings {
    return this._settings
  }

  setPatternName(value: string) {
    const patternName = this.normalizePatternName(value)
    this._settings.patternName = patternName
    this._state.patternName = patternName
  }

  setPatternScale(value: number) {
    if (!Number.isFinite(value) || value <= 0) return
    this._settings.patternScale = value
    this._state.patternScale = value
  }

  setPatternAngle(value: number) {
    if (!Number.isFinite(value)) return
    this._settings.patternAngleDeg = value
    this._state.patternAngle = value
  }

  setStyle(value: HatchRibbonStyle) {
    this._settings.style = this.keywordToStyle(value)
    this._state.style = value
  }

  setAssociative(value: boolean) {
    this._settings.associative = value
    this._state.associative = value
  }

  requestPickPoints() {
    this.requestAction('pickPoints')
  }

  requestSelectObjects() {
    this.requestAction('selectObjects')
  }

  close() {
    this.requestAction('close')
  }

  async execute(context: AcApContext) {
    this._isActive = true
    try {
      let running = true
      while (running) {
        const queuedAction = this.consumeQueuedAction()
        if (queuedAction) {
          running = await this.runRibbonAction(context, queuedAction)
          continue
        }

        const result = await AcApDocManager.instance.editor.getEntity(
          this.createBoundaryPrompt()
        )
        const actionAfterPrompt = this.consumeQueuedAction()
        if (actionAfterPrompt) {
          running = await this.runRibbonAction(context, actionAfterPrompt)
          continue
        }

        if (result.status === AcEdPromptStatus.OK && result.objectId) {
          const loops = this.collectLoopsFromIds(context, [result.objectId])
          if (loops.length) {
            this.appendHatch(context, loops)
          }
          continue
        }

        if (result.status === AcEdPromptStatus.Keyword) {
          await this.runKeyword(context, result.stringResult ?? '')
          continue
        }

        running = false
      }
    } finally {
      this._queuedAction = undefined
      this._isActive = false
    }
  }

  private requestAction(action: HatchRibbonAction) {
    this._queuedAction = action
    if (!this._isActive) {
      AcApDocManager.instance.sendStringToExecute(this.globalName || 'hatch')
      return
    }
    this.cancelActivePrompt()
  }

  private consumeQueuedAction() {
    const action = this._queuedAction
    this._queuedAction = undefined
    return action
  }

  private async runRibbonAction(
    context: AcApContext,
    action: HatchRibbonAction
  ) {
    if (action === 'close') return false
    if (action === 'pickPoints') {
      await this.doPickPoints(context)
    } else {
      await this.doSelectObjects(context)
    }
    return true
  }

  private async runKeyword(context: AcApContext, keyword: string) {
    if (keyword === 'PickPoints') {
      await this.doPickPoints(context)
    } else if (keyword === 'SelectObjects') {
      await this.doSelectObjects(context)
    } else if (keyword === 'Pattern') {
      await this.promptPatternName()
      this.syncStateFromSettings()
    } else if (keyword === 'Scale') {
      await this.promptPatternScale()
      this.syncStateFromSettings()
    } else if (keyword === 'Angle') {
      await this.promptPatternAngle()
      this.syncStateFromSettings()
    } else if (keyword === 'HatchStyle') {
      await this.promptStyle()
      this.syncStateFromSettings()
    } else if (keyword === 'AssociativeMode') {
      await this.promptAssociative()
      this.syncStateFromSettings()
    }
  }

  private createBoundaryPrompt() {
    const options = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.hatch.prompt')
    )
    options.allowNone = true
    options.setRejectMessage(AcApI18n.t('jig.hatch.invalidBoundary'))
    options.addAllowedClass('Polyline')
    options.addAllowedClass('Circle')
    options.addAllowedClass('Arc')
    options.addAllowedClass('Line')
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.pick.display'),
      AcApI18n.t('jig.hatch.keywords.pick.global'),
      AcApI18n.t('jig.hatch.keywords.pick.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.select.display'),
      AcApI18n.t('jig.hatch.keywords.select.global'),
      AcApI18n.t('jig.hatch.keywords.select.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.pattern.display'),
      AcApI18n.t('jig.hatch.keywords.pattern.global'),
      AcApI18n.t('jig.hatch.keywords.pattern.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.scale.display'),
      AcApI18n.t('jig.hatch.keywords.scale.global'),
      AcApI18n.t('jig.hatch.keywords.scale.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.angle.display'),
      AcApI18n.t('jig.hatch.keywords.angle.global'),
      AcApI18n.t('jig.hatch.keywords.angle.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.style.display'),
      AcApI18n.t('jig.hatch.keywords.style.global'),
      AcApI18n.t('jig.hatch.keywords.style.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.associative.display'),
      AcApI18n.t('jig.hatch.keywords.associative.global'),
      AcApI18n.t('jig.hatch.keywords.associative.local')
    )
    return options
  }

  private syncStateFromSettings() {
    this._state.patternName = this._settings.patternName
    this._state.patternScale = this._settings.patternScale
    this._state.patternAngle = this._settings.patternAngleDeg
    this._state.style = this.styleToKeyword(
      this._settings.style
    ) as HatchRibbonStyle
    this._state.associative = this._settings.associative
  }

  private cancelActivePrompt() {
    if (typeof document === 'undefined') return
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
    )
  }
}

export const hatchRibbonCommand = new AcApHatchRibbonCmd()
