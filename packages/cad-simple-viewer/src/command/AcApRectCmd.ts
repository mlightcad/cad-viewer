import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptAngleOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus,
  eventBus
} from '../editor'
import { AcApI18n } from '../i18n'

const EPSILON = 1e-9
const FILLET_BULGE_BASE = Math.tan(Math.PI / 8)

type RectKeywordKey =
  | 'chamfer'
  | 'elevation'
  | 'fillet'
  | 'thickness'
  | 'width'
  | 'area'
  | 'dimensions'
  | 'rotation'
  | 'length'
  | 'rectWidth'

type RectBuildInput =
  | {
      mode: 'corner'
      secondPoint: AcGePoint2dLike
    }
  | {
      mode: 'dimensions'
      length: number
      width: number
    }

interface RectSettings {
  chamferDist1: number
  chamferDist2: number
  filletRadius: number
  width: number
  elevation: number
  thickness: number
  rotation: number
}

interface RectVertex {
  point: AcGePoint2d
  bulge?: number
}

const DEFAULT_RECT_SETTINGS: RectSettings = {
  chamferDist1: 0,
  chamferDist2: 0,
  filletRadius: 0,
  width: 0,
  elevation: 0,
  thickness: 0,
  rotation: 0
}

function addKeyword(prompt: AcEdPromptPointOptions, key: RectKeywordKey) {
  prompt.keywords.add(
    AcApI18n.t(`jig.rect.keywords.${key}.display`),
    AcApI18n.t(`jig.rect.keywords.${key}.global`),
    AcApI18n.t(`jig.rect.keywords.${key}.local`)
  )
}

function addDoubleKeyword(
  prompt: AcEdPromptDoubleOptions,
  key: RectKeywordKey
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.rect.keywords.${key}.display`),
    AcApI18n.t(`jig.rect.keywords.${key}.global`),
    AcApI18n.t(`jig.rect.keywords.${key}.local`)
  )
}

function warnRectMessage(key: string) {
  eventBus.emit('message', {
    message: AcApI18n.t(`jig.rect.${key}`),
    type: 'warning'
  })
}

function toWorldPoint(
  origin: AcGePoint2dLike,
  local: AcGePoint2dLike,
  rotation: number
) {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return new AcGePoint2d(
    origin.x + local.x * cos - local.y * sin,
    origin.y + local.x * sin + local.y * cos
  )
}

function toLocalVector(
  origin: AcGePoint2dLike,
  point: AcGePoint2dLike,
  rotation: number
) {
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return new AcGePoint2d(dx * cos + dy * sin, -dx * sin + dy * cos)
}

function normalizeNonNegative(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 0
  return Math.max(0, value ?? 0)
}

function buildSquareVertices(lx: number, ly: number): RectVertex[] {
  return [
    { point: new AcGePoint2d(0, 0) },
    { point: new AcGePoint2d(lx, 0) },
    { point: new AcGePoint2d(lx, ly) },
    { point: new AcGePoint2d(0, ly) }
  ]
}

function buildChamferVertices(
  lx: number,
  ly: number,
  distance1: number,
  distance2: number
): RectVertex[] {
  const sx = lx >= 0 ? 1 : -1
  const sy = ly >= 0 ? 1 : -1
  const absX = Math.abs(lx)
  const absY = Math.abs(ly)
  const d1 = Math.min(normalizeNonNegative(distance1), absX / 2)
  const d2 = Math.min(normalizeNonNegative(distance2), absY / 2)

  if (d1 <= EPSILON && d2 <= EPSILON) {
    return buildSquareVertices(lx, ly)
  }

  const c1Out = new AcGePoint2d(sx * d1, 0)
  const c1In = new AcGePoint2d(0, sy * d2)
  const c2In = new AcGePoint2d(lx - sx * d1, 0)
  const c2Out = new AcGePoint2d(lx, sy * d2)
  const c3In = new AcGePoint2d(lx, ly - sy * d2)
  const c3Out = new AcGePoint2d(lx - sx * d1, ly)
  const c4In = new AcGePoint2d(sx * d1, ly)
  const c4Out = new AcGePoint2d(0, ly - sy * d2)

  return [
    { point: c1Out },
    { point: c2In },
    { point: c2Out },
    { point: c3In },
    { point: c3Out },
    { point: c4In },
    { point: c4Out },
    { point: c1In }
  ]
}

function buildFilletVertices(
  lx: number,
  ly: number,
  radius: number
): RectVertex[] {
  const absX = Math.abs(lx)
  const absY = Math.abs(ly)
  const r = Math.min(normalizeNonNegative(radius), absX / 2, absY / 2)
  if (r <= EPSILON) return buildSquareVertices(lx, ly)

  const chamferLike = buildChamferVertices(lx, ly, r, r)
  const orientation = lx * ly >= 0 ? 1 : -1
  const bulge = orientation * FILLET_BULGE_BASE

  // Arc segments are: c2In->c2Out, c3In->c3Out, c4In->c4Out, c1In->c1Out(closed).
  // These are represented by bulge on vertices 1, 3, 5, 7 respectively.
  return chamferLike.map((vertex, index) => ({
    point: vertex.point,
    bulge: index % 2 === 1 ? bulge : undefined
  }))
}

function resolveRectVertices(
  lx: number,
  ly: number,
  settings: RectSettings
): RectVertex[] {
  if (settings.filletRadius > EPSILON) {
    return buildFilletVertices(lx, ly, settings.filletRadius)
  }
  if (settings.chamferDist1 > EPSILON || settings.chamferDist2 > EPSILON) {
    return buildChamferVertices(
      lx,
      ly,
      settings.chamferDist1,
      settings.chamferDist2
    )
  }
  return buildSquareVertices(lx, ly)
}

function updateRect(
  rect: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  input: RectBuildInput,
  settings: RectSettings
) {
  let lx = 0
  let ly = 0
  if (input.mode === 'corner') {
    const local = toLocalVector(
      firstPoint,
      input.secondPoint,
      settings.rotation
    )
    lx = local.x
    ly = local.y
  } else {
    lx = input.length
    ly = input.width
  }

  if (Math.abs(lx) <= EPSILON || Math.abs(ly) <= EPSILON) return false

  rect.reset(false)
  const vertices = resolveRectVertices(lx, ly, settings)
  const segWidth = normalizeNonNegative(settings.width)

  vertices.forEach((vertex, index) => {
    const worldPoint = toWorldPoint(firstPoint, vertex.point, settings.rotation)
    if (segWidth > EPSILON) {
      rect.addVertexAt(index, worldPoint, vertex.bulge, segWidth, segWidth)
    } else {
      rect.addVertexAt(index, worldPoint, vertex.bulge)
    }
  })
  rect.elevation = settings.elevation
  rect.closed = true
  return true
}

/**
 * Dynamic preview jig for RECT command.
 */
export class AcApRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  /**
   * Preview polyline entity reused across cursor updates.
   */
  private _rect: AcDbPolyline
  /**
   * Fixed first-corner point captured at jig start.
   */
  private _firstPoint: AcGePoint2d
  /**
   * Lazily supplies latest rectangle settings (fillet/chamfer/rotation...).
   */
  private _settingsProvider: () => RectSettings

  /**
   * Creates a dynamic rectangle preview jig.
   *
   * @param view - Active editor view used to render transient geometry.
   * @param start - First corner point of the rectangle.
   * @param settingsProvider - Callback that returns current command settings.
   */
  constructor(
    view: AcEdBaseView,
    start: AcGePoint2dLike,
    settingsProvider: () => RectSettings
  ) {
    super(view)
    this._rect = new AcDbPolyline()
    this._firstPoint = new AcGePoint2d(start)
    this._settingsProvider = settingsProvider
  }

  /**
   * Gets the transient polyline entity displayed by the jig.
   */
  get entity(): AcDbPolyline {
    return this._rect
  }

  /**
   * Rebuilds preview geometry from the current cursor point.
   *
   * @param secondPoint - Dynamic opposite corner point under the cursor.
   */
  update(secondPoint: AcGePoint2dLike) {
    updateRect(
      this._rect,
      this._firstPoint,
      { mode: 'corner', secondPoint },
      this._settingsProvider()
    )
  }
}

/**
 * Static rectangle preview jig used for non-point prompts (angle/number input).
 *
 * The geometry is built once in the constructor and then kept unchanged.
 *
 * @typeParam T - Prompt value type that drives this jig instance.
 */
class AcApRectStaticJig<T> extends AcEdPreviewJig<T> {
  /**
   * Transient static rectangle entity.
   */
  private _rect: AcDbPolyline

  /**
   * Creates a static preview jig with precomputed rectangle geometry.
   *
   * @param view - Active editor view.
   * @param firstPoint - Rectangle base corner.
   * @param input - Rectangle construction input (corner or dimensions).
   * @param settings - Rectangle style/transform settings.
   */
  constructor(
    view: AcEdBaseView,
    firstPoint: AcGePoint2dLike,
    input: RectBuildInput,
    settings: RectSettings
  ) {
    super(view)
    this._rect = new AcDbPolyline()
    updateRect(this._rect, firstPoint, input, settings)
  }

  /**
   * Gets the transient static rectangle entity.
   */
  get entity(): AcDbPolyline {
    return this._rect
  }

  /**
   * No-op update hook required by preview jig interface.
   *
   * @param _value - Prompt value (unused for static preview).
   */
  update(_value: T) {
    // No-op. Static preview.
  }
}

function cloneRectSettings(settings: RectSettings): RectSettings {
  return {
    chamferDist1: settings.chamferDist1,
    chamferDist2: settings.chamferDist2,
    filletRadius: settings.filletRadius,
    width: settings.width,
    elevation: settings.elevation,
    thickness: settings.thickness,
    rotation: settings.rotation
  }
}

function isPositive(value: number | undefined) {
  return Number.isFinite(value ?? NaN) && (value ?? 0) > EPSILON
}

/**
 * Command to create one rectangle with AutoCAD-like branching options.
 */
export class AcApRectCmd extends AcEdCommand {
  /**
   * Last-used rectangle settings persisted between command invocations.
   */
  private static _settings: RectSettings = cloneRectSettings(
    DEFAULT_RECT_SETTINGS
  )

  /**
   * Creates RECT command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Flow:
   * 1. Prompt first corner and first-stage options.
   * 2. Prompt second-corner input, dimensions, or area workflow.
   * 3. Build final polyline and append it to model space.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const settings = cloneRectSettings(AcApRectCmd._settings)

    const firstPoint = await this.promptFirstCorner(settings)
    if (!firstPoint) return

    const secondInput = await this.promptSecondInput(
      context,
      firstPoint,
      settings
    )
    if (!secondInput) return

    const rect = new AcDbPolyline()
    const isValid = updateRect(rect, firstPoint, secondInput, settings)
    if (!isValid) {
      warnRectMessage('invalidRect')
      return
    }

    if (settings.thickness > EPSILON) {
      warnRectMessage('thicknessNotSupported')
    }

    context.doc.database.tables.blockTable.modelSpace.appendEntity(rect)
    AcApRectCmd._settings = cloneRectSettings(settings)
  }

  /**
   * Prompts for the first rectangle corner while handling setup keywords.
   *
   * Supported options at this step: Chamfer, Elevation, Fillet, Thickness, Width.
   *
   * @param settings - Mutable settings object updated in-place by options.
   * @returns First corner point, or `undefined` when user cancels.
   */
  private async promptFirstCorner(settings: RectSettings) {
    while (true) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.rect.firstPointWithOptions')
      )
      addKeyword(prompt, 'chamfer')
      addKeyword(prompt, 'elevation')
      addKeyword(prompt, 'fillet')
      addKeyword(prompt, 'thickness')
      addKeyword(prompt, 'width')

      const result = await AcApDocManager.instance.editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.OK) {
        return result.value!
      }
      if (result.status !== AcEdPromptStatus.Keyword) return undefined

      const keyword = result.stringResult ?? ''
      if (keyword === 'Chamfer') {
        const ok = await this.promptChamfer(settings)
        if (!ok) return undefined
      } else if (keyword === 'Elevation') {
        const ok = await this.promptElevation(settings)
        if (!ok) return undefined
      } else if (keyword === 'Fillet') {
        const ok = await this.promptFillet(settings)
        if (!ok) return undefined
      } else if (keyword === 'Thickness') {
        const ok = await this.promptThickness(settings)
        if (!ok) return undefined
      } else if (keyword === 'Width') {
        const ok = await this.promptWidth(settings)
        if (!ok) return undefined
      }
    }
  }

  /**
   * Prompts for rectangle completion input after first corner is known.
   *
   * Supports direct opposite corner pick or switching to Area/Dimensions/Rotation
   * branches through a point-prompt state machine.
   *
   * @param context - Current application/document context.
   * @param firstPoint - First corner point.
   * @param settings - Mutable rectangle settings used by preview/build.
   * @returns Final rectangle build input, or `undefined` on cancel.
   */
  private async promptSecondInput(
    context: AcApContext,
    firstPoint: AcGePoint2dLike,
    settings: RectSettings
  ) {
    let finalInput: RectBuildInput | undefined

    type RectState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type StepResult = AcEdPromptStateStep

    /**
     * State-machine node that handles the "other corner" prompt step.
     */
    class CornerState implements RectState {
      /**
       * Creates corner state handler.
       *
       * @param cmd - Owning RECT command instance.
       */
      constructor(private cmd: AcApRectCmd) {}

      /**
       * Builds the point prompt for second-corner input.
       *
       * @returns Configured point prompt with keywords and preview jig.
       */
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.rect.otherCornerWithOptions')
        )
        addKeyword(prompt, 'area')
        addKeyword(prompt, 'dimensions')
        addKeyword(prompt, 'rotation')
        prompt.useDashedLine = false
        prompt.useBasePoint = true
        prompt.basePoint = new AcGePoint3d(firstPoint)
        prompt.jig = new AcApRectJig(context.view, firstPoint, () => settings)
        return prompt
      }

      /**
       * Handles point/keyword result and drives state transitions.
       *
       * @param result - User input result from point prompt.
       * @returns State-machine step result.
       */
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          finalInput = { mode: 'corner', secondPoint: result.value! }
          return 'finish'
        }
        if (result.status !== AcEdPromptStatus.Keyword) return 'finish'

        const keyword = result.stringResult ?? ''
        if (keyword === 'Rotation') {
          const ok = await this.cmd.promptRotation(
            context,
            firstPoint,
            settings
          )
          if (!ok) return 'finish'
          return 'continue'
        }
        if (keyword === 'Dimensions') {
          const dims = await this.cmd.promptDimensions(
            context,
            firstPoint,
            settings
          )
          if (!dims) return 'finish'
          finalInput = dims
          return 'finish'
        }
        if (keyword === 'Area') {
          const dims = await this.cmd.promptArea(context, firstPoint, settings)
          if (!dims) return 'finish'
          finalInput = dims
          return 'finish'
        }
        return 'continue'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new CornerState(this))
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))
    return finalInput
  }

  /**
   * Prompts for a strictly positive numeric value.
   *
   * @param message - Prompt message text.
   * @param jig - Optional preview jig displayed during input.
   * @returns Positive number, or `undefined` when canceled.
   */
  private async promptPositiveDouble(
    message: string,
    jig?: AcEdPreviewJig<number>
  ) {
    while (true) {
      const prompt = new AcEdPromptDoubleOptions(message)
      prompt.allowNegative = false
      prompt.allowZero = false
      if (jig) prompt.jig = jig
      const result = await AcApDocManager.instance.editor.getDouble(prompt)
      if (result.status !== AcEdPromptStatus.OK) return undefined
      if (isPositive(result.value)) return result.value!
      warnRectMessage('invalidPositive')
    }
  }

  /**
   * Prompts chamfer distances and updates settings.
   *
   * Also clears fillet mode, because chamfer and fillet are mutually exclusive.
   *
   * @param settings - Mutable rectangle settings.
   * @returns `true` when values are accepted, otherwise `false`.
   */
  private async promptChamfer(settings: RectSettings) {
    const d1 = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.chamferFirst')
    )
    if (!isPositive(d1)) return false
    const d2 = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.chamferSecond')
    )
    if (!isPositive(d2)) return false
    settings.chamferDist1 = d1!
    settings.chamferDist2 = d2!
    settings.filletRadius = 0
    return true
  }

  /**
   * Prompts fillet radius and updates settings.
   *
   * Also clears chamfer values, because fillet and chamfer are mutually exclusive.
   *
   * @param settings - Mutable rectangle settings.
   * @returns `true` when value is accepted, otherwise `false`.
   */
  private async promptFillet(settings: RectSettings) {
    const radius = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.filletRadius')
    )
    if (!isPositive(radius)) return false
    settings.filletRadius = radius!
    settings.chamferDist1 = 0
    settings.chamferDist2 = 0
    return true
  }

  /**
   * Prompts segment width and updates settings.
   *
   * @param settings - Mutable rectangle settings.
   * @returns `true` when value is accepted, otherwise `false`.
   */
  private async promptWidth(settings: RectSettings) {
    const prompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('jig.rect.segmentWidth')
    )
    prompt.allowNegative = false
    prompt.allowZero = true
    const result = await AcApDocManager.instance.editor.getDouble(prompt)
    if (result.status !== AcEdPromptStatus.OK) return false
    settings.width = normalizeNonNegative(result.value)
    return true
  }

  /**
   * Prompts elevation and updates settings.
   *
   * @param settings - Mutable rectangle settings.
   * @returns `true` when value is accepted, otherwise `false`.
   */
  private async promptElevation(settings: RectSettings) {
    const prompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('jig.rect.elevationValue')
    )
    prompt.allowNegative = true
    prompt.allowZero = true
    const result = await AcApDocManager.instance.editor.getDouble(prompt)
    if (result.status !== AcEdPromptStatus.OK) return false
    settings.elevation = result.value ?? 0
    return true
  }

  /**
   * Prompts thickness and updates settings.
   *
   * @param settings - Mutable rectangle settings.
   * @returns `true` when value is accepted, otherwise `false`.
   */
  private async promptThickness(settings: RectSettings) {
    const prompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('jig.rect.thicknessValue')
    )
    prompt.allowNegative = false
    prompt.allowZero = true
    const result = await AcApDocManager.instance.editor.getDouble(prompt)
    if (result.status !== AcEdPromptStatus.OK) return false
    settings.thickness = normalizeNonNegative(result.value)
    return true
  }

  /**
   * Prompts rectangle rotation angle and updates settings.
   *
   * @param context - Current application/document context.
   * @param firstPoint - First corner used as angle base point.
   * @param settings - Mutable rectangle settings.
   * @returns `true` when value is accepted, otherwise `false`.
   */
  private async promptRotation(
    context: AcApContext,
    firstPoint: AcGePoint2dLike,
    settings: RectSettings
  ) {
    const prompt = new AcEdPromptAngleOptions(
      AcApI18n.t('jig.rect.rotationAngle')
    )
    prompt.useBasePoint = true
    prompt.useDashedLine = true
    prompt.basePoint = new AcGePoint3d(firstPoint)
    prompt.allowNegative = true
    prompt.allowZero = true
    prompt.jig = new AcApRectStaticJig<number>(
      context.view,
      firstPoint,
      { mode: 'dimensions', length: 1, width: 1 },
      settings
    )
    const result = await AcApDocManager.instance.editor.getAngle(prompt)
    if (result.status !== AcEdPromptStatus.OK) return false
    settings.rotation = ((result.value ?? 0) * Math.PI) / 180
    return true
  }

  /**
   * Prompts rectangle length and width explicitly.
   *
   * @param context - Current application/document context.
   * @param firstPoint - First corner point.
   * @param settings - Mutable rectangle settings.
   * @returns Dimension-based build input, or `undefined` on cancel.
   */
  private async promptDimensions(
    context: AcApContext,
    firstPoint: AcGePoint2dLike,
    settings: RectSettings
  ) {
    const seedInput: RectBuildInput = {
      mode: 'dimensions',
      length: 1,
      width: 1
    }
    const length = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.dimensionLength'),
      new AcApRectStaticJig<number>(
        context.view,
        firstPoint,
        seedInput,
        settings
      )
    )
    if (!isPositive(length)) return undefined

    const width = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.dimensionWidth'),
      new AcApRectStaticJig<number>(
        context.view,
        firstPoint,
        { mode: 'dimensions', length: length!, width: 1 },
        settings
      )
    )
    if (!isPositive(width)) return undefined

    return {
      mode: 'dimensions',
      length: length!,
      width: width!
    } satisfies RectBuildInput
  }

  /**
   * Prompts rectangle area, then asks for either known length or known width.
   *
   * @param context - Current application/document context.
   * @param firstPoint - First corner point.
   * @param settings - Mutable rectangle settings.
   * @returns Dimension-based build input derived from area, or `undefined`.
   */
  private async promptArea(
    context: AcApContext,
    firstPoint: AcGePoint2dLike,
    settings: RectSettings
  ) {
    const area = await this.promptPositiveDouble(
      AcApI18n.t('jig.rect.areaValue'),
      new AcApRectStaticJig<number>(
        context.view,
        firstPoint,
        { mode: 'dimensions', length: 1, width: 1 },
        settings
      )
    )
    if (!isPositive(area)) return undefined

    const knownPrompt = new AcEdPromptDoubleOptions(
      AcApI18n.t('jig.rect.areaLengthOrWidth')
    )
    addDoubleKeyword(knownPrompt, 'rectWidth')
    knownPrompt.allowNegative = false
    knownPrompt.allowZero = false
    knownPrompt.jig = new AcApRectStaticJig<number>(
      context.view,
      firstPoint,
      { mode: 'dimensions', length: 1, width: 1 },
      settings
    )

    const knownResult =
      await AcApDocManager.instance.editor.getDouble(knownPrompt)
    if (knownResult.status === AcEdPromptStatus.Keyword) {
      if (knownResult.stringResult !== 'Width') return undefined
      const width = await this.promptPositiveDouble(
        AcApI18n.t('jig.rect.areaSpecifyWidth'),
        new AcApRectStaticJig<number>(
          context.view,
          firstPoint,
          { mode: 'dimensions', length: 1, width: 1 },
          settings
        )
      )
      if (!isPositive(width)) return undefined
      return {
        mode: 'dimensions',
        length: (area ?? 0) / (width ?? 1),
        width: width!
      } satisfies RectBuildInput
    }
    if (knownResult.status !== AcEdPromptStatus.OK) return undefined
    if (!isPositive(knownResult.value)) return undefined

    const length = knownResult.value!
    return {
      mode: 'dimensions',
      length,
      width: (area ?? 0) / length
    } satisfies RectBuildInput
  }
}
