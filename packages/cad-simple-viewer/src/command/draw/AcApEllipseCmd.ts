import {
  AcDbEllipse,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3dLike
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
  eventBus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLineJig } from './AcApLineCmd'

const EPSILON = 1e-9
const TAU = Math.PI * 2
const POSITIVE_NORMAL: AcGeVector3dLike = { x: 0, y: 0, z: 1 }

type EllipseKeywordKey = 'arc' | 'center' | 'rotation'

interface EllipseDefinition {
  center: AcGePoint3dLike
  majorAxis: AcGeVector3dLike
  majorRadius: number
  minorRadius: number
  startAngle: number
  endAngle: number
}

function distance2d(p1: AcGePoint3dLike, p2: AcGePoint3dLike) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

function midpoint2d(p1: AcGePoint3dLike, p2: AcGePoint3dLike): AcGePoint3dLike {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: 0
  }
}

function normalizeVector2d(x: number, y: number): AcGeVector3dLike | undefined {
  const length = Math.hypot(x, y)
  if (!Number.isFinite(length) || length <= EPSILON) return undefined
  return { x: x / length, y: y / length, z: 0 }
}

function perpendicular2d(unit: AcGeVector3dLike): AcGeVector3dLike {
  return { x: -unit.y, y: unit.x, z: 0 }
}

function degToRad(degree: number) {
  return (degree * Math.PI) / 180
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function axisAngleDeg(axis: AcGeVector3dLike) {
  return radToDeg(Math.atan2(axis.y, axis.x))
}

/**
 * Converts a geometric direction angle (from center, relative to major axis)
 * to ellipse parameter angle used by AcGeEllipseArc3d.
 *
 * Ellipse parameterization:
 *   x = a * cos(t), y = b * sin(t)
 * Geometric ray angle alpha satisfies:
 *   tan(alpha) = (b * sin(t)) / (a * cos(t))
 * so:
 *   t = atan2(a * sin(alpha), b * cos(alpha))
 */
function geometricAngleDegToEllipseParamRad(
  geometricAngleDeg: number,
  majorRadius: number,
  minorRadius: number
) {
  const alpha = degToRad(geometricAngleDeg)
  return Math.atan2(
    majorRadius * Math.sin(alpha),
    minorRadius * Math.cos(alpha)
  )
}

function axisUnitFromCenterToPoint(
  center: AcGePoint3dLike,
  point: AcGePoint3dLike
) {
  return normalizeVector2d(point.x - center.x, point.y - center.y)
}

function buildEllipseDefinition(
  center: AcGePoint3dLike,
  firstAxisUnit: AcGeVector3dLike,
  firstAxisRadius: number,
  secondAxisRadius: number,
  startAngle: number = 0,
  endAngle: number = TAU
): EllipseDefinition | undefined {
  if (
    !Number.isFinite(firstAxisRadius) ||
    !Number.isFinite(secondAxisRadius) ||
    firstAxisRadius <= EPSILON ||
    secondAxisRadius <= EPSILON
  ) {
    return undefined
  }

  if (firstAxisRadius >= secondAxisRadius) {
    return {
      center: { x: center.x, y: center.y, z: 0 },
      majorAxis: firstAxisUnit,
      majorRadius: firstAxisRadius,
      minorRadius: secondAxisRadius,
      startAngle,
      endAngle
    }
  }

  return {
    center: { x: center.x, y: center.y, z: 0 },
    majorAxis: perpendicular2d(firstAxisUnit),
    majorRadius: secondAxisRadius,
    minorRadius: firstAxisRadius,
    startAngle,
    endAngle
  }
}

function createFallbackEllipse(point: AcGePoint3dLike) {
  return new AcDbEllipse(
    point,
    POSITIVE_NORMAL,
    { x: 1, y: 0, z: 0 },
    1e-6,
    1e-6,
    0,
    TAU
  )
}

function applyEllipseDefinition(
  entity: AcDbEllipse,
  definition: EllipseDefinition
) {
  entity.center = definition.center
  entity.normal = POSITIVE_NORMAL
  entity.majorAxisRadius = definition.majorRadius
  entity.minorAxisRadius = definition.minorRadius
  entity.startAngle = definition.startAngle
  entity.endAngle = definition.endAngle

  const ellipseWithGeo = entity as unknown as {
    _geo?: { majorAxis?: AcGeVector3dLike }
  }
  if (ellipseWithGeo._geo) {
    ellipseWithGeo._geo.majorAxis = definition.majorAxis
  }
}

/**
 * Dynamic point-driven ellipse preview jig.
 */
class AcApEllipsePointJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient ellipse entity reused during preview updates.
   */
  private _ellipse: AcDbEllipse
  /**
   * Callback that maps cursor point to ellipse definition.
   */
  private _builder: (point: AcGePoint3dLike) => EllipseDefinition | undefined

  /**
   * Creates point-driven ellipse preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Cursor point to ellipse definition resolver.
   * @param fallbackPoint - Fallback point used to create valid initial entity.
   */
  constructor(
    view: AcEdBaseView,
    builder: (point: AcGePoint3dLike) => EllipseDefinition | undefined,
    fallbackPoint: AcGePoint3dLike
  ) {
    super(view)
    this._builder = builder
    this._ellipse = createFallbackEllipse(fallbackPoint)
  }

  /**
   * Gets transient ellipse entity displayed by this jig.
   */
  get entity(): AcDbEllipse {
    return this._ellipse
  }

  /**
   * Recomputes preview ellipse from cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: AcGePoint3dLike) {
    const definition = this._builder(point)
    if (!definition) return
    applyEllipseDefinition(this._ellipse, definition)
  }
}

/**
 * Dynamic numeric-input ellipse preview jig.
 */
class AcApEllipseDistanceJig extends AcEdPreviewJig<number> {
  /**
   * Transient ellipse entity reused during numeric preview updates.
   */
  private _ellipse: AcDbEllipse
  /**
   * Callback that maps numeric input to ellipse definition.
   */
  private _builder: (value: number) => EllipseDefinition | undefined

  /**
   * Creates numeric-input ellipse preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Numeric value to ellipse definition resolver.
   * @param fallbackPoint - Fallback point used to create valid initial entity.
   */
  constructor(
    view: AcEdBaseView,
    builder: (value: number) => EllipseDefinition | undefined,
    fallbackPoint: AcGePoint3dLike
  ) {
    super(view)
    this._builder = builder
    this._ellipse = createFallbackEllipse(fallbackPoint)
  }

  /**
   * Gets transient ellipse entity displayed by this jig.
   */
  get entity(): AcDbEllipse {
    return this._ellipse
  }

  /**
   * Recomputes preview ellipse from numeric input value.
   *
   * @param value - Current numeric prompt value.
   */
  update(value: number) {
    const definition = this._builder(value)
    if (!definition) return
    applyEllipseDefinition(this._ellipse, definition)
  }
}

/**
 * Command to create one ellipse or ellipse arc.
 */
export class AcApEllipseCmd extends AcEdCommand {
  /**
   * Creates ELLIPSE command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supported branches:
   * - Axis endpoint workflow
   * - Center-first workflow
   * - Arc-prefixed variants for ellipse arc creation
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const entryPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ellipse.axisEndpointOrOptions')
    )
    this.addKeyword(entryPrompt, 'arc')
    this.addKeyword(entryPrompt, 'center')
    const entryResult =
      await AcApDocManager.instance.editor.getPoint(entryPrompt)

    if (entryResult.status === AcEdPromptStatus.Keyword) {
      const keyword = entryResult.stringResult ?? ''
      if (keyword === 'Center') {
        await this.runCenterFlow(context, false)
      } else if (keyword === 'Arc') {
        await this.runArcEntryFlow(context)
      }
      return
    }

    if (entryResult.status !== AcEdPromptStatus.OK) return
    await this.runAxisEndFlow(context, entryResult.value!, false)
  }

  /**
   * Adds one localized keyword to a point prompt.
   *
   * @param prompt - Target point prompt.
   * @param key - Keyword i18n key suffix.
   */
  private addKeyword(prompt: AcEdPromptPointOptions, key: EllipseKeywordKey) {
    prompt.keywords.add(
      AcApI18n.t(`jig.ellipse.keywords.${key}.display`),
      AcApI18n.t(`jig.ellipse.keywords.${key}.global`),
      AcApI18n.t(`jig.ellipse.keywords.${key}.local`)
    )
  }

  /**
   * Appends final ellipse entity to model space.
   *
   * @param context - Current application/document context.
   * @param definition - Ellipse geometric definition to append.
   */
  private appendEllipse(context: AcApContext, definition: EllipseDefinition) {
    const ellipse = new AcDbEllipse(
      definition.center,
      POSITIVE_NORMAL,
      definition.majorAxis,
      definition.majorRadius,
      definition.minorRadius,
      definition.startAngle,
      definition.endAngle
    )
    context.doc.database.tables.blockTable.modelSpace.appendEntity(ellipse)
  }

  /**
   * Emits one warning message for invalid ellipse input.
   *
   * @param key - Invalid-input category key.
   */
  private warnInvalidInput(key: 'axis' | 'otherAxis' | 'rotation') {
    eventBus.emit('message', {
      message: AcApI18n.t(`jig.ellipse.invalid.${key}`),
      type: 'warning'
    })
  }

  /**
   * Runs `Arc` entry branch where user can provide axis endpoints or center.
   *
   * @param context - Current application/document context.
   */
  private async runArcEntryFlow(context: AcApContext) {
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ellipse.arcAxisEndpointOrCenter')
    )
    this.addKeyword(prompt, 'center')
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Center') {
        await this.runCenterFlow(context, true)
      }
      return
    }
    if (result.status !== AcEdPromptStatus.OK) return
    await this.runAxisEndFlow(context, result.value!, true)
  }

  /**
   * Runs center-first workflow:
   * center -> first axis endpoint -> other axis/rotation -> optional arc angles.
   *
   * @param context - Current application/document context.
   * @param arcMode - Whether to continue into arc-angle prompts.
   */
  private async runCenterFlow(context: AcApContext, arcMode: boolean) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ellipse.center')
    )
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK) return
    const center = centerResult.value!

    const axisEndPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ellipse.firstAxisEndpoint')
    )
    axisEndPrompt.useDashedLine = true
    axisEndPrompt.useBasePoint = true
    axisEndPrompt.basePoint = new AcGePoint3d(center)
    axisEndPrompt.jig = new AcApLineJig(context.view, center)
    const axisEndResult =
      await AcApDocManager.instance.editor.getPoint(axisEndPrompt)
    if (axisEndResult.status !== AcEdPromptStatus.OK) return

    const axisUnit = axisUnitFromCenterToPoint(center, axisEndResult.value!)
    if (!axisUnit) {
      this.warnInvalidInput('axis')
      return
    }
    const axisRadius = distance2d(center, axisEndResult.value!)
    const definition = await this.promptOtherAxis(
      context,
      center,
      axisUnit,
      axisRadius,
      arcMode
    )
    if (!definition) return
    this.appendEllipse(context, definition)
  }

  /**
   * Runs axis-endpoint workflow:
   * first axis endpoint -> second axis endpoint -> other axis/rotation.
   *
   * @param context - Current application/document context.
   * @param firstAxisEndpoint - First endpoint of major/minor axis line.
   * @param arcMode - Whether to continue into arc-angle prompts.
   */
  private async runAxisEndFlow(
    context: AcApContext,
    firstAxisEndpoint: AcGePoint3dLike,
    arcMode: boolean
  ) {
    const secondAxisPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ellipse.secondAxisEndpoint')
    )
    secondAxisPrompt.useDashedLine = true
    secondAxisPrompt.useBasePoint = true
    secondAxisPrompt.basePoint = new AcGePoint3d(firstAxisEndpoint)
    secondAxisPrompt.jig = new AcApLineJig(context.view, firstAxisEndpoint)
    const secondAxisResult =
      await AcApDocManager.instance.editor.getPoint(secondAxisPrompt)
    if (secondAxisResult.status !== AcEdPromptStatus.OK) return

    const secondAxisEndpoint = secondAxisResult.value!
    const axisVectorX = secondAxisEndpoint.x - firstAxisEndpoint.x
    const axisVectorY = secondAxisEndpoint.y - firstAxisEndpoint.y
    const axisUnit = normalizeVector2d(axisVectorX, axisVectorY)
    if (!axisUnit) {
      this.warnInvalidInput('axis')
      return
    }

    const center = midpoint2d(firstAxisEndpoint, secondAxisEndpoint)
    const axisRadius = distance2d(firstAxisEndpoint, secondAxisEndpoint) / 2
    const definition = await this.promptOtherAxis(
      context,
      center,
      axisUnit,
      axisRadius,
      arcMode
    )
    if (!definition) return
    this.appendEllipse(context, definition)
  }

  /**
   * Prompts for the second axis radius by point or rotation angle option.
   *
   * In arc mode, this method also continues into arc start/end angle prompts.
   *
   * @param context - Current application/document context.
   * @param center - Ellipse center point.
   * @param firstAxisUnit - Unit direction of first specified axis.
   * @param firstAxisRadius - Radius length along first specified axis.
   * @param arcMode - Whether to return an ellipse arc definition.
   * @returns Final ellipse definition, or `undefined` on cancel/invalid.
   */
  private async promptOtherAxis(
    context: AcApContext,
    center: AcGePoint3dLike,
    firstAxisUnit: AcGeVector3dLike,
    firstAxisRadius: number,
    arcMode: boolean
  ) {
    while (true) {
      const otherAxisPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.ellipse.otherAxisOrRotation')
      )
      this.addKeyword(otherAxisPrompt, 'rotation')
      otherAxisPrompt.useDashedLine = true
      otherAxisPrompt.useBasePoint = true
      otherAxisPrompt.basePoint = new AcGePoint3d(center)
      otherAxisPrompt.jig = new AcApEllipsePointJig(
        context.view,
        point => {
          const otherAxisRadius = distance2d(center, point)
          return buildEllipseDefinition(
            center,
            firstAxisUnit,
            firstAxisRadius,
            otherAxisRadius
          )
        },
        center
      )

      const otherAxisResult =
        await AcApDocManager.instance.editor.getPoint(otherAxisPrompt)
      if (otherAxisResult.status === AcEdPromptStatus.Keyword) {
        if (otherAxisResult.stringResult !== 'Rotation') return undefined

        const rotationPrompt = new AcEdPromptDoubleOptions(
          AcApI18n.t('jig.ellipse.rotationAngle')
        )
        rotationPrompt.allowNegative = false
        rotationPrompt.allowZero = true
        rotationPrompt.jig = new AcApEllipseDistanceJig(
          context.view,
          degreeValue => {
            const secondAxisRadius =
              firstAxisRadius * Math.abs(Math.cos(degToRad(degreeValue)))
            return buildEllipseDefinition(
              center,
              firstAxisUnit,
              firstAxisRadius,
              secondAxisRadius
            )
          },
          center
        )

        const rotationResult =
          await AcApDocManager.instance.editor.getDouble(rotationPrompt)
        if (rotationResult.status !== AcEdPromptStatus.OK) return undefined

        const secondAxisRadius =
          firstAxisRadius *
          Math.abs(Math.cos(degToRad(rotationResult.value ?? 0)))
        const definition = buildEllipseDefinition(
          center,
          firstAxisUnit,
          firstAxisRadius,
          secondAxisRadius
        )
        if (!definition) {
          this.warnInvalidInput('rotation')
          continue
        }
        if (!arcMode) return definition
        return await this.promptArcAngles(context, definition)
      }

      if (otherAxisResult.status !== AcEdPromptStatus.OK) return undefined
      const otherAxisRadius = distance2d(center, otherAxisResult.value!)
      const definition = buildEllipseDefinition(
        center,
        firstAxisUnit,
        firstAxisRadius,
        otherAxisRadius
      )
      if (!definition) {
        this.warnInvalidInput('otherAxis')
        continue
      }

      if (!arcMode) return definition
      return await this.promptArcAngles(context, definition)
    }
  }

  /**
   * Prompts start and end angles for ellipse-arc creation.
   *
   * @param context - Current application/document context.
   * @param baseEllipse - Base full-ellipse definition before arc trimming.
   * @returns Arc ellipse definition, or `undefined` when canceled.
   */
  private async promptArcAngles(
    context: AcApContext,
    baseEllipse: EllipseDefinition
  ) {
    const majorAxisBaseAngle = axisAngleDeg(baseEllipse.majorAxis)
    const startPrompt = new AcEdPromptAngleOptions(
      AcApI18n.t('jig.ellipse.arcStartAngle')
    )
    startPrompt.allowNegative = true
    startPrompt.useBasePoint = true
    startPrompt.useDashedLine = true
    startPrompt.basePoint = new AcGePoint3d(baseEllipse.center)
    startPrompt.baseAngle = majorAxisBaseAngle
    startPrompt.jig = new AcApEllipseDistanceJig(
      context.view,
      degreeValue => ({
        ...baseEllipse,
        startAngle: geometricAngleDegToEllipseParamRad(
          degreeValue,
          baseEllipse.majorRadius,
          baseEllipse.minorRadius
        ),
        endAngle: TAU
      }),
      baseEllipse.center
    )
    const startResult =
      await AcApDocManager.instance.editor.getAngle(startPrompt)
    if (startResult.status !== AcEdPromptStatus.OK) return undefined

    const startAngle = geometricAngleDegToEllipseParamRad(
      startResult.value ?? 0,
      baseEllipse.majorRadius,
      baseEllipse.minorRadius
    )
    const endPrompt = new AcEdPromptAngleOptions(
      AcApI18n.t('jig.ellipse.arcEndAngle')
    )
    endPrompt.allowNegative = true
    endPrompt.useBasePoint = true
    endPrompt.useDashedLine = true
    endPrompt.basePoint = new AcGePoint3d(baseEllipse.center)
    endPrompt.baseAngle = majorAxisBaseAngle
    endPrompt.jig = new AcApEllipseDistanceJig(
      context.view,
      degreeValue => ({
        ...baseEllipse,
        startAngle,
        endAngle: geometricAngleDegToEllipseParamRad(
          degreeValue,
          baseEllipse.majorRadius,
          baseEllipse.minorRadius
        )
      }),
      baseEllipse.center
    )
    const endResult = await AcApDocManager.instance.editor.getAngle(endPrompt)
    if (endResult.status !== AcEdPromptStatus.OK) return undefined

    return {
      ...baseEllipse,
      startAngle,
      endAngle: geometricAngleDegToEllipseParamRad(
        endResult.value ?? 0,
        baseEllipse.majorRadius,
        baseEllipse.minorRadius
      )
    }
  }
}
