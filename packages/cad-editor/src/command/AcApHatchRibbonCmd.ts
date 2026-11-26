import {
  AcApContext,
  AcApDocManager,
  AcApHatchCmd,
  AcApLayerService,
  acapRunDatabaseEdit,
  type HatchSettings
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcCmTransparency,
  type AcDbDatabase,
  type AcDbGradientName,
  AcDbHatch,
  AcDbHatchObjectType,
  AcDbHatchPatternType,
  AcDbSystemVariables,
  type AcDbSysVarEventArgs,
  AcDbSysVarManager,
  DEFAULT_GRADIENT_HATCH_NAME,
  DEFAULT_HATCH_PATTERN_IMPERIAL,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'
import { reactive } from 'vue'

export type HatchRibbonStyle = 'Normal' | 'Outer' | 'Ignore'
/** AutoCAD HPORIGINMODE values used by the Origin ribbon panel. */
export type HatchOriginMode = 0 | 1 | 2 | 3 | 4 | 5
export type HatchFillType = 'solid' | 'pattern' | 'gradient'

export interface HatchRibbonState {
  patternName: string
  hatchObjectType: AcDbHatchObjectType
  patternScale: number
  patternAngle: number
  style: HatchRibbonStyle
  /** HPORIGINMODE — 0 uses HPORIGIN; 1–5 use boundary extents. */
  originMode: HatchOriginMode
  associative: boolean
  fillType: HatchFillType
  fillColor: string
  backgroundColor: string
  gradient2Color: string
  opacity: number
}

type HatchRibbonAction =
  | 'pickPoints'
  | 'selectObjects'
  | 'removeBoundaries'
  | 'recreateBoundary'
  | 'setOrigin'
  | 'close'
type HatchColorInput = string | AcCmColor

const DEFAULT_HATCH_FILL_COLOR = new AcCmColor().setByLayer().toString()
const DEFAULT_HATCH_BACKGROUND_COLOR = 'None'
const DEFAULT_HATCH_GRADIENT_COLOR = new AcCmColor()
  .setRGB(255, 255, 255)
  .toString()
const HATCH_GRADIENT_PATTERN_PREFIX = 'GR_'
const HATCH_GRADIENT_NAMES = new Set<AcDbGradientName>([
  'LINEAR',
  'CYLINDER',
  'INVCYLINDER',
  'SPHERICAL',
  'INVSPHERICAL',
  'HEMISPHERICAL',
  'INVHEMISPHERICAL',
  'CURVED',
  'INVCURVED'
])
const DEFAULT_HATCH_GRADIENT_PATTERN_NAME = `${HATCH_GRADIENT_PATTERN_PREFIX}${DEFAULT_GRADIENT_HATCH_NAME}`

export class AcApHatchRibbonCmd extends AcApHatchCmd {
  private readonly _state = reactive<HatchRibbonState>({
    patternName: DEFAULT_HATCH_PATTERN_IMPERIAL,
    hatchObjectType: AcDbHatchObjectType.HatchObject,
    patternScale: 1,
    patternAngle: 0,
    style: 'Normal',
    originMode: 0,
    associative: true,
    fillType: 'solid',
    fillColor: DEFAULT_HATCH_FILL_COLOR,
    backgroundColor: DEFAULT_HATCH_BACKGROUND_COLOR,
    gradient2Color: DEFAULT_HATCH_GRADIENT_COLOR,
    opacity: 0
  })

  private _isActive = false
  private _queuedAction: HatchRibbonAction | undefined
  private _sysVarChangeListener:
    | ((args: AcDbSysVarEventArgs) => void)
    | undefined
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
    const patternName =
      (sysVarManager.getVar(AcDbSystemVariables.HPNAME, database) as string) ??
      DEFAULT_HATCH_PATTERN_IMPERIAL
    this._state.patternName = patternName
    this._state.fillType = this.inferFillTypeFromPatternName(patternName)
    this._state.hatchObjectType = this.inferHatchObjectTypeFromFillType(
      this._state.fillType
    )
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
    this._state.style = this.readRibbonStyle(database)
    this._state.originMode = this.readOriginMode(database)
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
            case 'islandDetectionEnabled':
              return true
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
              ) as string) ?? DEFAULT_HATCH_PATTERN_IMPERIAL
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
            return this.styleFromIslandDetection(
              sysVarManager.getVar(
                AcDbSystemVariables.HPISLANDDETECTION,
                database
              )
            )
          case 'islandDetectionEnabled':
            return (
              Number(
                sysVarManager.getVar(
                  AcDbSystemVariables.HPISLANDDETECTIONMODE,
                  database
                )
              ) !== 0
            )
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
              sysVarManager.setVar(
                AcDbSystemVariables.HPISLANDDETECTIONMODE,
                1,
                database
              )
              sysVarManager.setVar(
                AcDbSystemVariables.HPISLANDDETECTION,
                this.islandDetectionFromStyle(value),
                database
              )
            }
            break
          case 'islandDetectionEnabled':
            if (typeof value === 'boolean') {
              sysVarManager.setVar(
                AcDbSystemVariables.HPISLANDDETECTIONMODE,
                value ? 1 : 0,
                database
              )
              if (!value) {
                this._state.style = 'Ignore'
              }
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

  private readRibbonStyle(database: AcDbDatabase): HatchRibbonStyle {
    const sysVarManager = AcDbSysVarManager.instance()
    const mode = Number(
      sysVarManager.getVar(AcDbSystemVariables.HPISLANDDETECTIONMODE, database)
    )
    // Island detection off (e.g. from a loaded drawing) fills through islands
    // exactly like Ignore, so the ribbon shows it as Ignore.
    if (mode === 0) return 'Ignore'
    return this.styleToKeyword(
      this.styleFromIslandDetection(
        sysVarManager.getVar(AcDbSystemVariables.HPISLANDDETECTION, database)
      )
    ) as HatchRibbonStyle
  }

  private readOriginMode(database: AcDbDatabase): HatchOriginMode {
    const mode = Math.trunc(
      Number(
        AcDbSysVarManager.instance().getVar(
          AcDbSystemVariables.HPORIGINMODE,
          database
        )
      )
    )
    return (mode >= 0 && mode <= 5 ? mode : 0) as HatchOriginMode
  }

  private initializeSysVarListener() {
    if (this._sysVarChangeListener) return

    this._sysVarChangeListener = (args: AcDbSysVarEventArgs) => {
      const varName = args.name?.toLowerCase()
      if (varName === AcDbSystemVariables.HPNAME.toLowerCase()) {
        const patternName =
          (args.newVal as string) ?? DEFAULT_HATCH_PATTERN_IMPERIAL
        this._state.patternName = patternName
        this._state.fillType = this.inferFillTypeFromPatternName(patternName)
        this._state.hatchObjectType = this.inferHatchObjectTypeFromFillType(
          this._state.fillType
        )
      } else if (varName === AcDbSystemVariables.HPSCALE.toLowerCase()) {
        this._state.patternScale = this.normalizePositiveNumber(args.newVal, 1)
      } else if (varName === AcDbSystemVariables.HPANG.toLowerCase()) {
        this._state.patternAngle = this.radiansToDegrees(
          this.normalizeNumber(args.newVal, 0)
        )
      } else if (varName === AcDbSystemVariables.HPASSOC.toLowerCase()) {
        this._state.associative = Number(args.newVal) !== 0
      } else if (
        varName === AcDbSystemVariables.HPISLANDDETECTION.toLowerCase() ||
        varName === AcDbSystemVariables.HPISLANDDETECTIONMODE.toLowerCase()
      ) {
        const database = AcApDocManager.instance.curDocument?.database
        if (database) {
          this._state.style = this.readRibbonStyle(database)
        }
      } else if (varName === AcDbSystemVariables.HPORIGINMODE.toLowerCase()) {
        const mode = Math.trunc(Number(args.newVal))
        this._state.originMode = (
          mode >= 0 && mode <= 5 ? mode : 0
        ) as HatchOriginMode
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
      .filter(
        (entity): entity is AcDbHatch =>
          entity instanceof AcDbHatch &&
          // Pick-first may hold locked-layer hatches for viewing only.
          !AcApLayerService.isEntityOnLockedLayer(db, entity)
      )
  }

  private getFillPatternName() {
    const patternName = this.normalizePatternName(this._state.patternName)
    return patternName === HATCH_PATTERN_SOLID
      ? DEFAULT_HATCH_PATTERN_IMPERIAL
      : patternName
  }

  private inferFillTypeFromPatternName(patternName: string): HatchFillType {
    const normalized = this.normalizePatternName(patternName)
    if (normalized === HATCH_PATTERN_SOLID) return 'solid'
    if (normalized.startsWith(HATCH_GRADIENT_PATTERN_PREFIX)) return 'gradient'
    return 'pattern'
  }

  private getGradientName(): AcDbGradientName {
    const normalized = this.normalizePatternName(this._state.patternName)
    const name = normalized.startsWith(HATCH_GRADIENT_PATTERN_PREFIX)
      ? normalized.slice(HATCH_GRADIENT_PATTERN_PREFIX.length)
      : normalized
    return HATCH_GRADIENT_NAMES.has(name as AcDbGradientName)
      ? (name as AcDbGradientName)
      : (DEFAULT_GRADIENT_HATCH_NAME as AcDbGradientName)
  }

  private inferHatchObjectTypeFromFillType(fillType: HatchFillType) {
    return fillType === 'gradient'
      ? AcDbHatchObjectType.GradientObject
      : AcDbHatchObjectType.HatchObject
  }

  private toRgb(value: HatchColorInput) {
    return this.toAcCmColor(value)?.RGB
  }

  private applyStateToSelectedHatches() {
    // The live HPQUICKPREVIEW hatch must follow every ribbon option change
    // (island style Normal ↔ Outer keeps the same loops, so the preview's
    // loop cache would otherwise keep the stale hatch).
    this.refreshActivePreview()

    const docManager = AcApDocManager.instance
    const db = docManager.curDocument?.database
    if (!db) return

    const hatches = this.getSelectedHatches()
    if (hatches.length === 0) return

    this.editHatches(db, 'Hatch Properties', hatches, hatch =>
      this.applyStateToHatch(hatch)
    )
  }

  /**
   * Edits hatches as one undoable database edit and keeps the view in sync.
   *
   * While HATCH runs, its undo transaction is still open, so the database's
   * modified notification (which redraws the entity) only fires when the
   * command ends. Session hatches are therefore redrawn here right away so
   * ribbon option changes show up during Hatch Creation.
   */
  private editHatches(
    db: AcDbDatabase,
    label: string,
    hatches: ReadonlyArray<AcDbHatch>,
    edit: (hatch: AcDbHatch) => void
  ) {
    const redrawNow = db.isUndoRecording?.() ?? false
    const edited: AcDbHatch[] = []
    acapRunDatabaseEdit(db, label, () => {
      hatches.forEach(hatch => {
        const opened = db.openEntityForWrite(hatch)
        if (!(opened instanceof AcDbHatch)) return
        edit(opened)
        edited.push(opened)
      })
    })
    if (redrawNow && edited.length > 0) {
      AcApDocManager.instance.curView?.updateEntity(edited)
    }
  }

  private applyStateToHatch(hatch: AcDbHatch) {
    const fillColor = this.toAcCmColor(this._state.fillColor)
    const opacity = Math.max(0, Math.min(90, this._state.opacity))

    if (
      this._state.fillType === 'gradient' &&
      this._state.hatchObjectType === AcDbHatchObjectType.GradientObject
    ) {
      hatch.hatchObjectType = AcDbHatchObjectType.GradientObject
      hatch.gradientName = this.getGradientName()
      hatch.gradientStartColor = this.toRgb(this._state.fillColor)
      hatch.gradientEndColor = this.toRgb(this._state.gradient2Color)
      hatch.gradientAngle = (this._state.patternAngle * Math.PI) / 180
    } else {
      const isSolidFill = this._state.fillType === 'solid'
      const patternName = isSolidFill
        ? HATCH_PATTERN_SOLID
        : this.getFillPatternName()
      hatch.hatchObjectType = AcDbHatchObjectType.HatchObject
      hatch.patternName = patternName
      hatch.patternType = AcDbHatchPatternType.Predefined
      hatch.patternScale = this._state.patternScale
      hatch.patternAngle = (this._state.patternAngle * Math.PI) / 180
      hatch.hatchStyle = this.keywordToStyle(this._state.style)
      hatch.isSolidFill = isSolidFill
    }
    hatch.hatchObjectType = this._state.hatchObjectType

    if (fillColor) {
      hatch.color = fillColor
    }

    hatch.backgroundColor =
      this._state.fillType === 'pattern'
        ? this.toAcCmColor(this._state.backgroundColor)
        : undefined
    hatch.transparency = this.createTransparency(opacity)
    hatch.associative = this._state.associative && hatch.hasAnyPathSourceIds()
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
    } else {
      this.refreshActivePreview()
    }
  }

  setPatternNameFromGallery(value: string) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const patternName = this.normalizePatternName(value)
    this._state.patternName = patternName
    this._state.fillType = this.inferFillTypeFromPatternName(patternName)
    this._state.hatchObjectType = this.inferHatchObjectTypeFromFillType(
      this._state.fillType
    )

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPNAME, patternName, db)
    this.applyStateToSelectedHatches()
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
    const db = AcApDocManager.instance.curDocument?.database
    this._state.style = value
    const style = this.keywordToStyle(value)
    if (db) {
      const sysVarManager = AcDbSysVarManager.instance()
      sysVarManager.setVar(AcDbSystemVariables.HPISLANDDETECTIONMODE, 1, db)
      sysVarManager.setVar(
        AcDbSystemVariables.HPISLANDDETECTION,
        this.islandDetectionFromStyle(style),
        db
      )
    }
    this.refreshActivePreview()
    // Like AutoCAD's Hatch Editor, change only the island style of the
    // session / selected hatches: the hatch keeps all its island loops and
    // the style decides which of them are filled, so the fill updates while
    // the pattern, scale and colours of an existing hatch stay untouched.
    const hatches = this.getSelectedHatches()
    if (!db || hatches.length === 0) return
    this.editHatches(db, 'Hatch Island Detection', hatches, hatch => {
      hatch.hatchStyle = style
    })
  }

  /**
   * Applies an explicit hatch origin point (AutoCAD Set Origin).
   * Sets HPORIGINMODE to 0 and updates HPORIGIN.
   */
  applyOriginPoint(point: { x: number; y: number }) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPORIGINMODE, 0, db)
    sysVarManager.setVar(
      AcDbSystemVariables.HPORIGIN,
      { x: point.x, y: point.y, z: 0 },
      db
    )
    this._state.originMode = 0
    this.applyOriginToHatches(point)
  }

  /**
   * Sets HPORIGINMODE and refreshes hatch origins from extents or HPORIGIN.
   */
  setOriginMode(mode: HatchOriginMode) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPORIGINMODE,
      mode,
      db
    )
    this._state.originMode = mode

    const hatches = this.getEditableHatches()
    if (hatches.length === 0) return

    this.editHatches(db, 'Hatch Origin', hatches, hatch => {
      hatch.originPoint =
        mode === 0
          ? this.getHatchOriginSysVar(db)
          : this.originFromExtents(hatch, mode)
    })
  }

  /**
   * Stores the current hatch origin (or HPORIGIN) as the default HPORIGIN.
   */
  storeDefaultOrigin() {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const hatches = this.getEditableHatches()
    const origin =
      hatches.length > 0
        ? {
            x: hatches[0].originPoint.x,
            y: hatches[0].originPoint.y
          }
        : this.getHatchOriginSysVar(db)

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(
      AcDbSystemVariables.HPORIGIN,
      { x: origin.x, y: origin.y, z: 0 },
      db
    )
    sysVarManager.setVar(AcDbSystemVariables.HPORIGINMODE, 0, db)
    this._state.originMode = 0
  }

  private applyOriginToHatches(point: { x: number; y: number }) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return
    const hatches = this.getEditableHatches()
    if (hatches.length === 0) return

    this.editHatches(db, 'Hatch Origin', hatches, hatch => {
      hatch.originPoint = point
    })
  }

  /**
   * Session hatches while HATCH is active; otherwise the current selection.
   */
  private getEditableHatches() {
    if (this._isActive && this.sessionHatches.length > 0) {
      return [...this.sessionHatches]
    }
    return this.getSelectedHatches()
  }

  setAssociative(value: boolean) {
    const db = AcApDocManager.instance.curDocument?.database
    if (!db) return

    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPASSOC, value ? 1 : 0, db)
    this._state.associative = value
    // Re-apply so session / selected hatches pick up the flag when sources exist.
    this.applyStateToSelectedHatches()
  }

  setFillType(value: HatchFillType) {
    this._state.fillType = value
    this._state.hatchObjectType = this.inferHatchObjectTypeFromFillType(value)
    const db = AcApDocManager.instance.curDocument?.database
    const sysVarManager = AcDbSysVarManager.instance()

    if (value === 'solid') {
      this._state.patternName = HATCH_PATTERN_SOLID
      if (db) {
        sysVarManager.setVar(
          AcDbSystemVariables.HPNAME,
          HATCH_PATTERN_SOLID,
          db
        )
      }
    } else if (value === 'pattern') {
      this._state.patternName = DEFAULT_HATCH_PATTERN_IMPERIAL
      if (db) {
        sysVarManager.setVar(
          AcDbSystemVariables.HPNAME,
          DEFAULT_HATCH_PATTERN_IMPERIAL,
          db
        )
      }
    } else if (value === 'gradient') {
      this._state.patternName = DEFAULT_HATCH_GRADIENT_PATTERN_NAME
      if (db) {
        sysVarManager.setVar(
          AcDbSystemVariables.HPNAME,
          DEFAULT_HATCH_GRADIENT_PATTERN_NAME,
          db
        )
      }
    }

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

  /**
   * Starts Remove Boundaries (session hatches while HATCH is active; selected
   * hatches in Hatch Editor selection context).
   */
  requestRemoveBoundaries() {
    if (this._isActive) {
      this.requestAction('removeBoundaries')
      return
    }
    void this.runRemoveOutsideCommand()
  }

  /**
   * Starts Recreate Boundary on the current hatch selection.
   *
   * Disabled during Hatch Creation in the ribbon; selection-context editing
   * calls this outside the HATCH command.
   */
  requestRecreateBoundary() {
    if (this._isActive) {
      this.requestAction('recreateBoundary')
      return
    }
    void this.runRecreateOutsideCommand()
  }

  /**
   * Starts Set Origin: prompts for a point, then applies it to hatches.
   */
  requestSetOrigin() {
    if (this._isActive) {
      this.requestAction('setOrigin')
      return
    }
    void this.runSetOriginOutsideCommand()
  }

  close() {
    this.requestAction('close')
  }

  protected override get settings(): HatchSettings {
    return this._settingsProxy || ({} as HatchSettings)
  }

  protected override configureHatch(hatch: AcDbHatch) {
    this.applyStateToHatch(hatch)
  }

  protected override onSessionHatchCreated(hatch: AcDbHatch) {
    super.onSessionHatchCreated(hatch)
    // Track immediately — entityAppended is deferred until the outer command
    // transaction commits, so mid-session ribbon property edits need this id.
    this._activeHatchIds.add(hatch.objectId)
  }

  protected override onSessionHatchRemoved(hatch: AcDbHatch) {
    this._activeHatchIds.delete(hatch.objectId)
  }

  async execute(context: AcApContext) {
    this.syncStateFromSysVars()
    this._isActive = true
    this._activeHatchIds.clear()
    this.beginSession()
    try {
      let running = true
      while (running) {
        const queuedAction = this.consumeQueuedAction()
        if (queuedAction) {
          running = await this.runRibbonAction(context, queuedAction)
          continue
        }

        // AutoCAD Hatch Creation defaults to pick-points (with HPQUICKPREVIEW).
        const outcome = await this.doPickPoints(context)
        // Ribbon Close / Pick / Select cancel the active prompt via Escape and
        // queue an action. Prefer that action over treating Escape as discard.
        const actionAfterPrompt = this.consumeQueuedAction()
        if (actionAfterPrompt) {
          running = await this.runRibbonAction(context, actionAfterPrompt)
          continue
        }

        if (outcome === AcApHatchCmd.BRANCH_CANCEL) {
          this.markDiscardSession()
        }
        // Enter ends Hatch Creation (keeps session hatches); ESC discards above.
        running = false
      }
    } finally {
      this.finishSession(context)
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
    // Close accepts session hatches (AutoCAD: exit Hatch Creation).
    if (action === 'close') return false
    if (action === 'pickPoints' || action === 'selectObjects') {
      const outcome =
        action === 'pickPoints'
          ? await this.doPickPoints(context)
          : await this.doSelectObjects(context)
      if (outcome === AcApHatchCmd.BRANCH_CANCEL) {
        this.markDiscardSession()
        return false
      }
      // Select-objects Enter accepts the hatch and ends Hatch Creation.
      return outcome !== AcApHatchCmd.BRANCH_DONE
    }
    if (action === 'removeBoundaries') {
      if (
        (await this.doRemoveBoundaries(context, this.sessionHatches)) ===
        AcApHatchCmd.BRANCH_CANCEL
      ) {
        this.markDiscardSession()
        return false
      }
      return true
    }
    if (action === 'recreateBoundary') {
      const hatches = this.getSelectedHatches()
      if (
        (await this.doRecreateBoundary(context, hatches, {
          databaseEdit: true
        })) === AcApHatchCmd.BRANCH_CANCEL
      ) {
        this.markDiscardSession()
        return false
      }
      return true
    }
    if (action === 'setOrigin') {
      await this.runSetOriginPrompt()
      return true
    }
    return true
  }

  private async runRemoveOutsideCommand() {
    const context = AcApDocManager.instance.context
    if (!context) return
    const hatches = this.getSelectedHatches()
    await this.doRemoveBoundaries(context, hatches, { databaseEdit: true })
  }

  private async runRecreateOutsideCommand() {
    const context = AcApDocManager.instance.context
    if (!context) return
    const hatches = this.getSelectedHatches()
    await this.doRecreateBoundary(context, hatches, { databaseEdit: true })
  }

  private async runSetOriginOutsideCommand() {
    await this.runSetOriginPrompt()
  }

  private async runSetOriginPrompt() {
    const point = await this.promptHatchOriginPoint()
    if (!point) return
    this.applyOriginPoint(point)
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
