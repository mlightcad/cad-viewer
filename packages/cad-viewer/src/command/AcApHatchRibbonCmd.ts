import {
  AcApContext,
  AcApDocManager,
  AcApHatchCmd,
  AcApI18n,
  AcEdPromptEntityOptions,
  AcEdPromptStatus,
  type HatchSettings
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcCmTransparency,
  AcDbHatch,
  AcDbHatchObjectType,
  AcDbHatchPatternType,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'
import { reactive } from 'vue'

export type HatchRibbonStyle = 'Normal' | 'Outer' | 'Ignore'
export type HatchFillType = 'solid' | 'pattern' | 'gradient'

export interface HatchRibbonState {
  patternName: string
  patternScale: number
  patternAngle: number
  style: HatchRibbonStyle
  associative: boolean
  fillType: HatchFillType
  fillColor: string
  backgroundColor: string
  gradient2Color: string
  opacity: number
}

type HatchRibbonAction = 'pickPoints' | 'selectObjects' | 'close'
type HatchColorInput = string | AcCmColor

const DEFAULT_HATCH_FILL_COLOR = new AcCmColor().setByLayer().toString()
const DEFAULT_HATCH_BACKGROUND_COLOR = 'None'
const DEFAULT_HATCH_GRADIENT_COLOR = new AcCmColor()
  .setRGB(255, 255, 255)
  .toString()

export class AcApHatchRibbonCmd extends AcApHatchCmd {
  private readonly _state = reactive<HatchRibbonState>({
    patternName: 'ANSI31',
    patternScale: 1,
    patternAngle: 0,
    style: 'Normal',
    associative: true,
    fillType: 'solid',
    fillColor: DEFAULT_HATCH_FILL_COLOR,
    backgroundColor: DEFAULT_HATCH_BACKGROUND_COLOR,
    gradient2Color: DEFAULT_HATCH_GRADIENT_COLOR,
    opacity: 0
  })

  private _isActive = false
  private _queuedAction: HatchRibbonAction | undefined
  private _sysVarChangeListener: ((args: any) => void) | undefined
  private _settingsProxy: HatchSettings | undefined
  private readonly _activeHatchIds = new Set<string>()

  constructor() {
    super()
    this.initializeSettingsProxy()
    this.initializeSysVarListener()
  }

  syncStateFromSysVars() {
    const database = AcApDocManager.instance.curDocument?.database
    if (!database) return

    const sysVarManager = AcDbSysVarManager.instance()
    this._state.patternName =
      (sysVarManager.getVar(AcDbSystemVariables.HPNAME, database) as string) ??
      'ANSI31'
    this._state.patternScale = this.normalizePositiveNumber(
      sysVarManager.getVar(AcDbSystemVariables.HPSCALE, database),
      1
    )
    this._state.patternAngle = this.radiansToDegrees(
      this.normalizeNumber(
        sysVarManager.getVar(AcDbSystemVariables.HPANG, database),
        0
      )
    )
    this._state.associative =
      Number(sysVarManager.getVar(AcDbSystemVariables.HPASSOC, database)) !== 0
    this._state.fillColor = this.normalizeColorString(
      sysVarManager.getVar(AcDbSystemVariables.HPCOLOR, database),
      DEFAULT_HATCH_FILL_COLOR
    )
    this._state.backgroundColor = this.normalizeColorString(
      sysVarManager.getVar(AcDbSystemVariables.HPBACKGROUNDCOLOR, database),
      DEFAULT_HATCH_BACKGROUND_COLOR
    )
    this._state.opacity = this.normalizeTransparencyPercentage(
      sysVarManager.getVar(AcDbSystemVariables.HPTRANSPARENCY, database)
    )
  }

  private initializeSettingsProxy() {
    this._settingsProxy = new Proxy({} as HatchSettings, {
      get: (_target, prop) => {
        const sysVarManager = AcDbSysVarManager.instance()
        const database = AcApDocManager.instance.curDocument?.database
        if (!database) {
          // Fallback to local state when database is not available
          switch (prop) {
            case 'patternName':
              return this._state.patternName
            case 'patternScale':
              return this._state.patternScale
            case 'patternAngleDeg':
              return this._state.patternAngle
            case 'style':
              return this.keywordToStyle(this._state.style)
            case 'associative':
              return this._state.associative
          }
          return undefined
        }

        switch (prop) {
          case 'patternName':
            return (
              (sysVarManager.getVar(
                AcDbSystemVariables.HPNAME,
                database
              ) as string) ?? 'ANSI31'
            )
          case 'patternScale':
            return this.normalizePositiveNumber(
              sysVarManager.getVar(AcDbSystemVariables.HPSCALE, database),
              1
            )
          case 'patternAngleDeg':
            return this.radiansToDegrees(
              this.normalizeNumber(
                sysVarManager.getVar(AcDbSystemVariables.HPANG, database),
                0
              )
            )
          case 'associative':
            return Boolean(
              sysVarManager.getVar(AcDbSystemVariables.HPASSOC, database)
            )
          case 'style':
            // Style is stored in local state since there's no dedicated system variable
            return this.keywordToStyle(this._state.style)
          default:
            return undefined
        }
      },
      set: (_target, prop, value) => {
        const sysVarManager = AcDbSysVarManager.instance()
        const database = AcApDocManager.instance.curDocument?.database
        if (!database) return true

        switch (prop) {
          case 'patternName':
            if (typeof value === 'string') {
              sysVarManager.setVar(AcDbSystemVariables.HPNAME, value, database)
            }
            break
          case 'patternScale':
            if (typeof value === 'number' && value > 0) {
              sysVarManager.setVar(AcDbSystemVariables.HPSCALE, value, database)
            }
            break
          case 'patternAngleDeg':
            if (typeof value === 'number') {
              sysVarManager.setVar(
                AcDbSystemVariables.HPANG,
                this.degreesToRadians(value),
                database
              )
            }
            break
          case 'style':
            if (typeof value === 'number') {
              this._state.style = this.styleToKeyword(value) as HatchRibbonStyle
            }
            break
          case 'associative':
            if (typeof value === 'boolean') {
              sysVarManager.setVar(
                AcDbSystemVariables.HPASSOC,
                value ? 1 : 0,
                database
              )
            }
            break
        }
        return true
      }
    })
  }

  private initializeSysVarListener() {
    if (this._sysVarChangeListener) return

    this._sysVarChangeListener = (args: any) => {
      const varName = args.name?.toLowerCase()
      if (varName === AcDbSystemVariables.HPNAME.toLowerCase()) {
        this._state.patternName = (args.newVal as string) ?? 'ANSI31'
      } else if (varName === AcDbSystemVariables.HPSCALE.toLowerCase()) {
        this._state.patternScale = this.normalizePositiveNumber(args.newVal, 1)
      } else if (varName === AcDbSystemVariables.HPANG.toLowerCase()) {
        this._state.patternAngle = this.radiansToDegrees(
          this.normalizeNumber(args.newVal, 0)
        )
      } else if (varName === AcDbSystemVariables.HPASSOC.toLowerCase()) {
        this._state.associative = Number(args.newVal) !== 0
      } else if (varName === AcDbSystemVariables.HPCOLOR.toLowerCase()) {
        this._state.fillColor = this.normalizeColorString(
          args.newVal,
          DEFAULT_HATCH_FILL_COLOR
        )
      } else if (
        varName === AcDbSystemVariables.HPBACKGROUNDCOLOR.toLowerCase()
      ) {
        this._state.backgroundColor = this.normalizeColorString(
          args.newVal,
          DEFAULT_HATCH_BACKGROUND_COLOR
        )
      } else if (varName === AcDbSystemVariables.HPTRANSPARENCY.toLowerCase()) {
        this._state.opacity = this.normalizeTransparencyPercentage(args.newVal)
      }
    }

    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this._sysVarChangeListener
    )
  }

  get state(): Readonly<HatchRibbonState> {
    return this._state
  }

  get isActive() {
    return this._isActive
  }

  private normalizeColorString(value: unknown, fallback: string) {
    if (value instanceof AcCmColor) return value.toString()
    if (typeof value === 'string') return value
    if (
      value &&
      typeof (value as { toString?: unknown }).toString === 'function'
    ) {
      const colorString = (value as { toString: () => string }).toString()
      if (colorString && colorString !== '[object Object]') {
        return colorString
      }
    }
    return fallback
  }

  private toAcCmColor(value: HatchColorInput) {
    if (value instanceof AcCmColor) return value
    const parsed = AcCmColor.fromString(value)
    if (parsed) return parsed
    if (value.trim().startsWith('#')) {
      return new AcCmColor().setRGBFromCss(value)
    }
    return undefined
  }

  private normalizeNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private normalizePositiveNumber(value: unknown, fallback: number) {
    const parsed = this.normalizeNumber(value, fallback)
    return parsed > 0 ? parsed : fallback
  }

  private degreesToRadians(value: number) {
    return (value * Math.PI) / 180
  }

  private radiansToDegrees(value: number) {
    return Math.round(((value * 180) / Math.PI) * 1e6) / 1e6
  }

  private normalizeTransparencyPercentage(value: unknown) {
    if (value instanceof AcCmTransparency) {
      return Math.max(0, Math.min(90, value.percentage ?? 0))
    }

    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 90) {
      return parsed
    }

    if (typeof value === 'string') {
      const transparency = AcCmTransparency.fromString(value)
      return Math.max(0, Math.min(90, transparency.percentage ?? 0))
    }

    return 0
  }

  private createTransparency(value: number) {
    const transparency = new AcCmTransparency()
    transparency.percentage = Math.max(0, Math.min(90, value))
    return transparency
  }

  private getSelectedHatches() {
    const docManager = AcApDocManager.instance
    const db = docManager.curDocument?.database
    const view = docManager.curView
    if (!db || !view) return []

    const blockTable = db.tables.blockTable
    const ids = new Set([...view.selectionSet.ids, ...this._activeHatchIds])
    return [...ids]
      .map(id => blockTable.getEntityById(id))
      .filter((entity): entity is AcDbHatch => entity instanceof AcDbHatch)
  }

  private getFillPatternName() {
    const patternName = this.normalizePatternName(this._state.patternName)
    return patternName === 'SOLID' ? 'ANSI31' : patternName
  }

  private toRgb(value: HatchColorInput) {
    return this.toAcCmColor(value)?.RGB
  }

  private applyStateToSelectedHatches() {
    const hatches = this.getSelectedHatches()
    if (hatches.length === 0) return

    hatches.forEach(hatch => this.applyStateToHatch(hatch, true))
  }

  private applyStateToHatch(hatch: AcDbHatch, triggerModified: boolean) {
    const fillColor = this.toAcCmColor(this._state.fillColor)
    const opacity = Math.max(0, Math.min(90, this._state.opacity))

    if (this._state.fillType === 'gradient') {
      hatch.hatchObjectType = AcDbHatchObjectType.GradientObject
      hatch.gradientStartColor = this.toRgb(this._state.fillColor)
      hatch.gradientEndColor = this.toRgb(this._state.gradient2Color)
      hatch.gradientAngle = (this._state.patternAngle * Math.PI) / 180
    } else {
      const isSolidFill = this._state.fillType === 'solid'
      const patternName = isSolidFill ? 'SOLID' : this.getFillPatternName()
      hatch.hatchObjectType = AcDbHatchObjectType.HatchObject
      hatch.patternName = patternName
      hatch.patternType = AcDbHatchPatternType.Predefined
      hatch.patternScale = this._state.patternScale
      hatch.patternAngle = (this._state.patternAngle * Math.PI) / 180
      hatch.hatchStyle = this.keywordToStyle(this._state.style)
      hatch.isSolidFill = isSolidFill
    }

    if (fillColor) {
      hatch.color = fillColor
    }

    hatch.backgroundColor =
      this._state.fillType === 'pattern'
        ? this.toAcCmColor(this._state.backgroundColor)
        : undefined
    hatch.transparency = this.createTransparency(opacity)

    if (triggerModified) {
      hatch.triggerModifiedEvent()
    }
  }

  setPatternName(value: string) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const patternName = this.normalizePatternName(value)
    this._state.patternName = patternName
    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPNAME, patternName, db)
    if (this._state.fillType === 'pattern') {
      this.applyStateToSelectedHatches()
    }
  }

  setPatternScale(value: number) {
    if (!Number.isFinite(value) || value <= 0) return

    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    this._state.patternScale = value
    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPSCALE, value, db)
    this.applyStateToSelectedHatches()
  }

  setPatternAngle(value: number) {
    if (!Number.isFinite(value)) return

    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    this._state.patternAngle = value
    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(
      AcDbSystemVariables.HPANG,
      this.degreesToRadians(value),
      db
    )
    this.applyStateToSelectedHatches()
  }

  setStyle(value: HatchRibbonStyle) {
    this._state.style = value
    this.applyStateToSelectedHatches()
  }

  setAssociative(value: boolean) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPASSOC, value ? 1 : 0, db)
  }

  setFillType(value: HatchFillType) {
    this._state.fillType = value
    this.applyStateToSelectedHatches()
  }

  setFillColor(value: HatchColorInput) {
    const color = this.toAcCmColor(value)
    const colorString =
      color?.toString() ??
      this.normalizeColorString(value, DEFAULT_HATCH_FILL_COLOR)
    this._state.fillColor = colorString
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPCOLOR, color ?? colorString, db)
    this.applyStateToSelectedHatches()
  }

  setBackgroundColor(value: HatchColorInput) {
    const color = this.toAcCmColor(value)
    const colorString =
      color?.toString() ??
      this.normalizeColorString(value, DEFAULT_HATCH_BACKGROUND_COLOR)
    this._state.backgroundColor = colorString
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(
      AcDbSystemVariables.HPBACKGROUNDCOLOR,
      color ?? colorString,
      db
    )
    this.applyStateToSelectedHatches()
  }

  setGradient2Color(value: HatchColorInput) {
    this._state.gradient2Color = this.normalizeColorString(
      value,
      DEFAULT_HATCH_GRADIENT_COLOR
    )
    this.applyStateToSelectedHatches()
  }

  setOpacity(value: number) {
    const clamp = Math.max(0, Math.min(90, value))
    this._state.opacity = clamp
    const db = AcApDocManager.instance.curDocument?.database
    if (db) {
      AcDbSysVarManager.instance().setVar(
        AcDbSystemVariables.HPTRANSPARENCY,
        this.createTransparency(clamp),
        db
      )
    }
    this.applyStateToSelectedHatches()
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

  protected override get settings(): HatchSettings {
    return this._settingsProxy || ({} as HatchSettings)
  }

  protected override configureHatch(hatch: AcDbHatch) {
    this.applyStateToHatch(hatch, false)
  }

  async execute(context: AcApContext) {
    this.syncStateFromSysVars()
    this._isActive = true
    this._activeHatchIds.clear()
    const entityAppendedListener = (args: any) => {
      if (args.entity instanceof AcDbHatch) {
        this._activeHatchIds.add(args.entity.objectId)
      }
    }
    context.doc.database.events.entityAppended.addEventListener(
      entityAppendedListener
    )
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
          running = await this.runKeyword(context, result.stringResult ?? '')
          continue
        }

        running = false
      }
    } finally {
      context.doc.database.events.entityAppended.removeEventListener(
        entityAppendedListener
      )
      this._activeHatchIds.clear()
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

  private async runKeyword(
    context: AcApContext,
    keyword: string
  ): Promise<boolean> {
    if (keyword === 'PickPoints') {
      await this.doPickPoints(context)
      return true
    } else if (keyword === 'SelectObjects') {
      await this.doSelectObjects(context)
      return true
    } else if (keyword === 'Cancel') {
      return false
    }
    return true
  }

  private createBoundaryPrompt() {
    const options = new AcEdPromptEntityOptions(AcApI18n.t('jig.hatch.prompt'))
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
      AcApI18n.t('jig.hatch.keywords.cancel.display'),
      AcApI18n.t('jig.hatch.keywords.cancel.global'),
      AcApI18n.t('jig.hatch.keywords.cancel.local')
    )
    return options
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
