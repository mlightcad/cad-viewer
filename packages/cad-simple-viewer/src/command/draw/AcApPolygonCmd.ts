import {
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions,
  eventBus
} from '../../editor'
import { AcApI18n } from '../../i18n'

const MIN_SIDES = 3
const MAX_SIDES = 1024
const EPSILON = 1e-9

type PolygonMode = 'Inscribed' | 'Circumscribed'
type PolygonKeywordKey = 'edge' | 'inscribed' | 'circumscribed'
type PolygonInvalidKey = 'sides' | 'radius' | 'edge'

function distance2d(p1: AcGePoint3dLike, p2: AcGePoint3dLike) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

function updatePolylineVertices(
  polyline: AcDbPolyline,
  vertices: AcGePoint2d[]
) {
  polyline.reset(false)
  vertices.forEach((point, index) => polyline.addVertexAt(index, point))
  polyline.closed = true
}

function buildPolygonFromCenter(
  center: AcGePoint3dLike,
  sides: number,
  point: AcGePoint3dLike,
  mode: PolygonMode
) {
  const inputRadius = distance2d(center, point)
  if (inputRadius <= EPSILON) return undefined

  const step = (Math.PI * 2) / sides
  const baseAngle = Math.atan2(point.y - center.y, point.x - center.x)
  const circumRadius =
    mode === 'Inscribed' ? inputRadius : inputRadius / Math.cos(Math.PI / sides)
  if (!Number.isFinite(circumRadius) || circumRadius <= EPSILON)
    return undefined

  const firstVertexAngle =
    mode === 'Inscribed' ? baseAngle : baseAngle + step / 2

  const vertices: AcGePoint2d[] = []
  for (let i = 0; i < sides; i++) {
    const angle = firstVertexAngle + i * step
    vertices.push(
      new AcGePoint2d(
        center.x + circumRadius * Math.cos(angle),
        center.y + circumRadius * Math.sin(angle)
      )
    )
  }

  return vertices
}

function buildPolygonFromEdge(
  firstPoint: AcGePoint3dLike,
  secondPoint: AcGePoint3dLike,
  sides: number
) {
  const dx = secondPoint.x - firstPoint.x
  const dy = secondPoint.y - firstPoint.y
  const edgeLength = Math.hypot(dx, dy)
  if (edgeLength <= EPSILON) return undefined

  const step = (Math.PI * 2) / sides
  const vertices: AcGePoint2d[] = [
    new AcGePoint2d(firstPoint),
    new AcGePoint2d(secondPoint)
  ]

  let currentX = secondPoint.x
  let currentY = secondPoint.y
  let edgeX = dx
  let edgeY = dy

  for (let i = 2; i < sides; i++) {
    const rotatedX = edgeX * Math.cos(step) - edgeY * Math.sin(step)
    const rotatedY = edgeX * Math.sin(step) + edgeY * Math.cos(step)
    currentX += rotatedX
    currentY += rotatedY
    vertices.push(new AcGePoint2d(currentX, currentY))
    edgeX = rotatedX
    edgeY = rotatedY
  }

  return vertices
}

/**
 * Dynamic preview jig for center-based polygon creation.
 */
class AcApPolygonCenterJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient polygon polyline shown during preview.
   */
  private _polyline: AcDbPolyline
  /**
   * Fixed polygon center point.
   */
  private _center: AcGePoint3dLike
  /**
   * Number of polygon sides.
   */
  private _sides: number
  /**
   * Provides current center-based construction mode.
   */
  private _modeProvider: () => PolygonMode

  /**
   * Creates center-mode polygon preview jig.
   *
   * @param view - Active editor view.
   * @param center - Polygon center point.
   * @param sides - Number of polygon sides.
   * @param modeProvider - Callback for current inscribed/circumscribed mode.
   */
  constructor(
    view: AcEdBaseView,
    center: AcGePoint3dLike,
    sides: number,
    modeProvider: () => PolygonMode
  ) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._center = center
    this._sides = sides
    this._modeProvider = modeProvider
  }

  /**
   * Gets transient polygon entity used by this jig.
   */
  get entity(): AcDbPolyline {
    return this._polyline
  }

  /**
   * Rebuilds preview polygon from cursor radius point.
   *
   * @param point - Current cursor point.
   */
  update(point: AcGePoint3dLike) {
    const vertices = buildPolygonFromCenter(
      this._center,
      this._sides,
      point,
      this._modeProvider()
    )
    if (!vertices) return
    updatePolylineVertices(this._polyline, vertices)
  }
}

/**
 * Dynamic preview jig for edge-based polygon creation.
 */
class AcApPolygonEdgeJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient polygon polyline shown during edge preview.
   */
  private _polyline: AcDbPolyline
  /**
   * Fixed first endpoint of the polygon edge.
   */
  private _firstPoint: AcGePoint3dLike
  /**
   * Number of polygon sides.
   */
  private _sides: number

  /**
   * Creates edge-mode polygon preview jig.
   *
   * @param view - Active editor view.
   * @param firstPoint - First endpoint of the seed edge.
   * @param sides - Number of polygon sides.
   */
  constructor(view: AcEdBaseView, firstPoint: AcGePoint3dLike, sides: number) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._firstPoint = firstPoint
    this._sides = sides
  }

  /**
   * Gets transient polygon entity used by this jig.
   */
  get entity(): AcDbPolyline {
    return this._polyline
  }

  /**
   * Rebuilds preview polygon from current second edge point.
   *
   * @param secondPoint - Current cursor point for edge endpoint.
   */
  update(secondPoint: AcGePoint3dLike) {
    const vertices = buildPolygonFromEdge(
      this._firstPoint,
      secondPoint,
      this._sides
    )
    if (!vertices) return
    updatePolylineVertices(this._polyline, vertices)
  }
}

/**
 * Command to create one regular polygon.
 *
 * AutoCAD-like flow:
 * - Enter number of sides (3-1024)
 * - Specify center point or [Edge]
 * - Center branch: specify radius point, with [Inscribed/Circumscribed] switch
 * - Edge branch: specify first and second endpoints of one edge
 */
export class AcApPolygonCmd extends AcEdCommand {
  /**
   * Last accepted side count used as default for next command run.
   */
  private static _lastSides = 4

  /**
   * Creates POLYGON command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const sides = await this.promptSides()
    if (sides == null) return

    const centerOrEdgePrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polygon.centerOrEdge')
    )
    this.addKeyword(centerOrEdgePrompt, 'edge')
    const centerOrEdgeResult =
      await AcApDocManager.instance.editor.getPoint(centerOrEdgePrompt)

    if (centerOrEdgeResult.status === AcEdPromptStatus.Keyword) {
      if (centerOrEdgeResult.stringResult === 'Edge') {
        await this.runEdgeFlow(context, sides)
      }
      return
    }

    if (centerOrEdgeResult.status !== AcEdPromptStatus.OK) return
    await this.runCenterFlow(context, sides, centerOrEdgeResult.value!)
  }

  /**
   * Adds one localized keyword to a point prompt.
   *
   * @param prompt - Target prompt object.
   * @param key - Keyword translation key suffix.
   */
  private addKeyword(prompt: AcEdPromptPointOptions, key: PolygonKeywordKey) {
    prompt.keywords.add(
      AcApI18n.t(`jig.polygon.keywords.${key}.display`),
      AcApI18n.t(`jig.polygon.keywords.${key}.global`),
      AcApI18n.t(`jig.polygon.keywords.${key}.local`)
    )
  }

  /**
   * Appends final polygon entity to model space.
   *
   * @param context - Current application/document context.
   * @param vertices - Polygon vertex list in world coordinates.
   */
  private appendPolygon(context: AcApContext, vertices: AcGePoint2d[]) {
    const polygon = new AcDbPolyline()
    updatePolylineVertices(polygon, vertices)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(polygon)
  }

  /**
   * Emits warning message for invalid polygon input.
   *
   * @param key - Invalid-input category.
   */
  private warnInvalidInput(key: PolygonInvalidKey) {
    eventBus.emit('message', {
      message: AcApI18n.t(`jig.polygon.invalid.${key}`),
      type: 'warning'
    })
  }

  /**
   * Prompts and validates polygon side count.
   *
   * @returns Valid side count, or `undefined` on cancel.
   */
  private async promptSides() {
    while (true) {
      const defaultSides = AcApPolygonCmd._lastSides
      const sidesPrompt = new AcEdPromptStringOptions(
        `${AcApI18n.t('jig.polygon.numberOfSides')} <${defaultSides}>`
      )
      sidesPrompt.allowEmpty = true
      sidesPrompt.allowSpaces = false
      const sidesResult =
        await AcApDocManager.instance.editor.getString(sidesPrompt)
      if (sidesResult.status !== AcEdPromptStatus.OK) return undefined

      const rawInput = (sidesResult.stringResult ?? '').trim()
      const rawValue = rawInput === '' ? defaultSides : Number(rawInput)
      if (
        Number.isInteger(rawValue) &&
        rawValue >= MIN_SIDES &&
        rawValue <= MAX_SIDES
      ) {
        AcApPolygonCmd._lastSides = rawValue
        return rawValue
      }

      this.warnInvalidInput('sides')
    }
  }

  /**
   * Runs center-based polygon flow.
   *
   * @param context - Current application/document context.
   * @param sides - Number of polygon sides.
   * @param center - Picked polygon center point.
   */
  private async runCenterFlow(
    context: AcApContext,
    sides: number,
    center: AcGePoint3dLike
  ) {
    let mode: PolygonMode = 'Inscribed'

    while (true) {
      const radiusPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.polygon.radiusOrType')
      )
      this.addKeyword(radiusPrompt, 'inscribed')
      this.addKeyword(radiusPrompt, 'circumscribed')
      radiusPrompt.useDashedLine = true
      radiusPrompt.useBasePoint = true
      radiusPrompt.basePoint = new AcGePoint3d(center)
      radiusPrompt.jig = new AcApPolygonCenterJig(
        context.view,
        center,
        sides,
        () => mode
      )

      const radiusResult =
        await AcApDocManager.instance.editor.getPoint(radiusPrompt)
      if (radiusResult.status === AcEdPromptStatus.Keyword) {
        const keyword = radiusResult.stringResult ?? ''
        if (keyword === 'Inscribed') {
          mode = 'Inscribed'
          continue
        }
        if (keyword === 'Circumscribed') {
          mode = 'Circumscribed'
          continue
        }
        return
      }

      if (radiusResult.status !== AcEdPromptStatus.OK) return
      const vertices = buildPolygonFromCenter(
        center,
        sides,
        radiusResult.value!,
        mode
      )
      if (!vertices) {
        this.warnInvalidInput('radius')
        continue
      }

      this.appendPolygon(context, vertices)
      return
    }
  }

  /**
   * Runs edge-based polygon flow.
   *
   * @param context - Current application/document context.
   * @param sides - Number of polygon sides.
   */
  private async runEdgeFlow(context: AcApContext, sides: number) {
    const firstEdgePrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polygon.edgeStart')
    )
    const firstEdgeResult =
      await AcApDocManager.instance.editor.getPoint(firstEdgePrompt)
    if (firstEdgeResult.status !== AcEdPromptStatus.OK) return
    const firstPoint = firstEdgeResult.value!

    const secondEdgePrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.polygon.edgeEnd')
    )
    secondEdgePrompt.useDashedLine = true
    secondEdgePrompt.useBasePoint = true
    secondEdgePrompt.basePoint = new AcGePoint3d(firstPoint)
    secondEdgePrompt.jig = new AcApPolygonEdgeJig(
      context.view,
      firstPoint,
      sides
    )
    const secondEdgeResult =
      await AcApDocManager.instance.editor.getPoint(secondEdgePrompt)
    if (secondEdgeResult.status !== AcEdPromptStatus.OK) return

    const vertices = buildPolygonFromEdge(
      firstPoint,
      secondEdgeResult.value!,
      sides
    )
    if (!vertices) {
      this.warnInvalidInput('edge')
      return
    }

    this.appendPolygon(context, vertices)
  }
}
