import {
  AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGeTol
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/** SKPOLY: 0 = lines, 1 = polyline, 2 = spline. */
export type AcApSketchType = 'line' | 'polyline' | 'spline'

export interface AcApSketchSettings {
  type: AcApSketchType
  /** SKETCHINC — minimum distance between successive sketch vertices. */
  increment: number
  /** SKTOLERANCE — how closely a spline fits the freehand points. */
  tolerance: number
}

interface AcApSketchStroke {
  points: AcGePoint2d[]
  type: AcApSketchType
  tolerance: number
}

const DEFAULT_SETTINGS: AcApSketchSettings = {
  type: 'line',
  increment: 0.1,
  tolerance: 0.5
}

type SketchKeywordKey =
  | 'type'
  | 'increment'
  | 'tolerance'
  | 'line'
  | 'polyline'
  | 'spline'

function addKeyword(
  prompt: AcEdPromptPointOptions | AcEdPromptKeywordOptions,
  key: SketchKeywordKey
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.sketch.keywords.${key}.display`),
    AcApI18n.t(`jig.sketch.keywords.${key}.global`),
    AcApI18n.t(`jig.sketch.keywords.${key}.local`)
  )
}

function distance2d(a: AcGePoint2dLike, b: AcGePoint2dLike): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function toPoint2d(point: AcGePoint2dLike): AcGePoint2d {
  return new AcGePoint2d(point.x, point.y)
}

function toPoint3d(point: AcGePoint2dLike): AcGePoint3d {
  return new AcGePoint3d(point.x, point.y, 0)
}

/**
 * Keeps a vertex when it is at least `increment` from the previous kept point.
 * The first point is always kept; the last point is appended if distinct.
 */
export function accumulateSketchPoint(
  points: AcGePoint2d[],
  point: AcGePoint2dLike,
  increment: number
): boolean {
  const next = toPoint2d(point)
  if (points.length === 0) {
    points.push(next)
    return true
  }
  const last = points[points.length - 1]
  if (distance2d(last, next) < increment) return false
  points.push(next)
  return true
}

/**
 * Downsamples sketch points so consecutive kept vertices are at least
 * `tolerance` apart, always retaining the first and last points.
 */
export function simplifySketchPoints(
  points: AcGePoint2dLike[],
  tolerance: number
): AcGePoint2d[] {
  if (points.length <= 2) {
    return points.map(toPoint2d)
  }
  const minDist = Math.max(tolerance, 1e-8)
  const simplified: AcGePoint2d[] = [toPoint2d(points[0])]
  for (let i = 1; i < points.length - 1; i++) {
    const last = simplified[simplified.length - 1]
    if (distance2d(last, points[i]) >= minDist) {
      simplified.push(toPoint2d(points[i]))
    }
  }
  const end = toPoint2d(points[points.length - 1])
  const last = simplified[simplified.length - 1]
  if (distance2d(last, end) > 1e-8) {
    simplified.push(end)
  }
  return simplified
}

/**
 * Preview jig that records freehand movement once the pointer travels farther
 * than the current sketch increment.
 */
export class AcApSketchJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _polyline: AcDbPolyline
  private _points: AcGePoint2d[]
  private _increment: number

  constructor(view: AcEdBaseView, start: AcGePoint2dLike, increment: number) {
    super(view)
    this._polyline = new AcDbPolyline()
    this._points = [toPoint2d(start)]
    this._increment = Math.max(increment, 1e-8)
    this._polyline.addVertexAt(0, this._points[0])
  }

  get entity(): AcDbPolyline {
    return this._polyline
  }

  get points(): AcGePoint2d[] {
    return this._points
  }

  update(currentPoint: AcGePoint2dLike) {
    if (!accumulateSketchPoint(this._points, currentPoint, this._increment)) {
      return
    }
    this._polyline.addVertexAt(
      this._points.length - 1,
      this._points[this._points.length - 1]
    )
  }
}

/**
 * Keeps completed sketch strokes visible while SKETCH is still running.
 *
 * The live stroke jig is torn down when a point prompt ends, and keyword
 * prompts never refresh jigs. Without this overlay, returning to
 * "Specify sketch or [Type/Increment/toLerance]" hides the sketch preview.
 */
class AcApSketchStrokePreview {
  private readonly _entities: AcDbEntity[] = []

  constructor(readonly view: AcEdBaseView) {}

  addStroke(points: AcGePoint2dLike[]) {
    if (points.length < 2) return
    const polyline = new AcDbPolyline()
    points.forEach((point, index) =>
      polyline.addVertexAt(index, toPoint2d(point))
    )
    this._entities.push(polyline)
    this.view.addTransientEntity(polyline)
  }

  /**
   * Re-publishes transients. Keyword and distance prompts do not drive jigs.
   */
  render() {
    this._entities.forEach(entity => this.view.addTransientEntity(entity))
  }

  dispose() {
    this._entities.forEach(entity =>
      this.view.removeTransientEntity(entity.objectId)
    )
    this._entities.length = 0
  }
}

/**
 * Point/distance prompt adapter that keeps {@link AcApSketchStrokePreview}
 * visible. Prompt cleanup calls `end()`, but this jig has no owned entity, so
 * completed strokes are not removed.
 */
class AcApSketchRetainJig<T> extends AcEdPreviewJig<T> {
  constructor(
    view: AcEdBaseView,
    private readonly preview: AcApSketchStrokePreview
  ) {
    super(view)
  }

  update(_value: T) {
    // Completed strokes are static; the preview is only re-published.
  }

  override render() {
    this.preview.render()
  }
}

/**
 * Command to create freehand sketches, aligned with AutoCAD SKETCH.
 *
 * Prompts: Specify sketch or [Type/Increment/toLerance]. Click to start a
 * stroke, move the pointer, click to stop. Enter ends the command.
 */
export class AcApSketchCmd extends AcEdCommand {
  private static _settings: AcApSketchSettings = { ...DEFAULT_SETTINGS }

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const settings = AcApSketchCmd._settings
    const strokes: AcApSketchStroke[] = []
    const preview = new AcApSketchStrokePreview(context.view)

    try {
      while (true) {
        preview.render()
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.sketch.specifySketch')
        )
        addKeyword(prompt, 'type')
        addKeyword(prompt, 'increment')
        addKeyword(prompt, 'tolerance')
        prompt.allowNone = true
        prompt.disableOSnap = true
        prompt.jig = new AcApSketchRetainJig(context.view, preview)

        const result = await AcApDocManager.instance.editor.getPoint(prompt)
        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Type') {
            const accepted = await this.promptType(settings, preview)
            if (!accepted) return
            continue
          }
          if (keyword === 'Increment') {
            const accepted = await this.promptIncrement(settings, preview)
            if (!accepted) return
            continue
          }
          if (keyword === 'Tolerance') {
            const accepted = await this.promptTolerance(settings, preview)
            if (!accepted) return
            continue
          }
          continue
        }

        if (result.status === AcEdPromptStatus.None) {
          this.commitStrokes(context, strokes)
          return
        }
        if (result.status !== AcEdPromptStatus.OK || !result.value) return

        const points = await this.captureStroke(
          context,
          settings,
          result.value,
          preview
        )
        if (points === false) return
        if (points.length >= 2) {
          strokes.push({
            points,
            type: settings.type,
            tolerance: settings.tolerance
          })
          preview.addStroke(points)
        }
      }
    } finally {
      preview.dispose()
    }
  }

  private async promptType(
    settings: AcApSketchSettings,
    preview?: AcApSketchStrokePreview
  ) {
    preview?.render()
    const prompt = new AcEdPromptKeywordOptions(AcApI18n.t('jig.sketch.type'))
    prompt.allowNone = true
    if (preview) {
      prompt.jig = new AcApSketchRetainJig(preview.view, preview)
    }
    const line = prompt.keywords.add(
      AcApI18n.t('jig.sketch.keywords.line.display'),
      AcApI18n.t('jig.sketch.keywords.line.global'),
      AcApI18n.t('jig.sketch.keywords.line.local')
    )
    const polyline = prompt.keywords.add(
      AcApI18n.t('jig.sketch.keywords.polyline.display'),
      AcApI18n.t('jig.sketch.keywords.polyline.global'),
      AcApI18n.t('jig.sketch.keywords.polyline.local')
    )
    const spline = prompt.keywords.add(
      AcApI18n.t('jig.sketch.keywords.spline.display'),
      AcApI18n.t('jig.sketch.keywords.spline.global'),
      AcApI18n.t('jig.sketch.keywords.spline.local')
    )
    prompt.keywords.default =
      settings.type === 'polyline'
        ? polyline
        : settings.type === 'spline'
          ? spline
          : line
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return false
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (result.stringResult === 'Polyline') settings.type = 'polyline'
      else if (result.stringResult === 'Spline') settings.type = 'spline'
      else if (
        result.stringResult === 'Line' ||
        result.stringResult === 'Lines'
      ) {
        settings.type = 'line'
      }
    }
    return true
  }

  private async promptIncrement(
    settings: AcApSketchSettings,
    preview?: AcApSketchStrokePreview
  ) {
    preview?.render()
    const prompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.sketch.increment')
    )
    prompt.allowNegative = false
    prompt.allowZero = false
    prompt.useDefaultValue = true
    prompt.defaultValue = settings.increment
    if (preview) {
      prompt.jig = new AcApSketchRetainJig(preview.view, preview)
    }
    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return false
    const value = result.value ?? settings.increment
    if (AcGeTol.isPositive(value)) {
      settings.increment = value
    }
    return true
  }

  private async promptTolerance(
    settings: AcApSketchSettings,
    preview?: AcApSketchStrokePreview
  ) {
    preview?.render()
    const prompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.sketch.tolerance')
    )
    prompt.allowNegative = false
    prompt.allowZero = true
    prompt.useDefaultValue = true
    prompt.defaultValue = settings.tolerance
    if (preview) {
      prompt.jig = new AcApSketchRetainJig(preview.view, preview)
    }
    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return false
    const value = result.value ?? settings.tolerance
    if (value >= 0 && Number.isFinite(value)) {
      settings.tolerance = value
    }
    return true
  }

  /**
   * Records one freehand stroke: click starts, move draws, click or Enter stops.
   *
   * @returns `false` when the user cancels the command entirely; otherwise the
   * captured points (possibly fewer than two if the stroke is too short).
   */
  private async captureStroke(
    context: AcApContext,
    settings: AcApSketchSettings,
    start: AcGePoint2dLike,
    preview: AcApSketchStrokePreview
  ): Promise<AcGePoint2d[] | false> {
    preview.render()
    const jig = new AcApSketchJig(context.view, start, settings.increment)
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.sketch.sketching')
    )
    prompt.jig = jig
    prompt.useDashedLine = false
    prompt.useBasePoint = true
    prompt.basePoint = toPoint3d(start)
    prompt.allowNone = true
    prompt.disableOSnap = true

    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return false

    const points = [...jig.points]
    if (result.status === AcEdPromptStatus.OK && result.value) {
      const last = points[points.length - 1]
      if (!last || distance2d(last, result.value) > 1e-8) {
        points.push(toPoint2d(result.value))
      }
    }
    return points
  }

  private commitStrokes(context: AcApContext, strokes: AcApSketchStroke[]) {
    for (const stroke of strokes) {
      this.appendStroke(context, stroke)
    }
  }

  private appendStroke(context: AcApContext, stroke: AcApSketchStroke) {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    const points = stroke.points
    if (stroke.type === 'line') {
      for (let i = 1; i < points.length; i++) {
        const line = new AcDbLine(
          toPoint3d(points[i - 1]),
          toPoint3d(points[i])
        )
        modelSpace.appendEntity(line)
        context.view.addEntity(line)
      }
      return
    }
    if (stroke.type === 'spline') {
      const fitPoints = simplifySketchPoints(points, stroke.tolerance)
      if (fitPoints.length < 2) return
      const points3d = fitPoints.map(toPoint3d)
      const degree = Math.min(3, Math.max(1, points3d.length - 1))
      const spline = new AcDbSpline(points3d, 'Chord', degree, false)
      modelSpace.appendEntity(spline)
      context.view.addEntity(spline)
      return
    }

    const polyline = new AcDbPolyline()
    points.forEach((point, index) => polyline.addVertexAt(index, point))
    modelSpace.appendEntity(polyline)
    context.view.addEntity(polyline)
  }
}
