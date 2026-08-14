import {
  AcDbEntity,
  AcDbPolyline,
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
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  type AcApRevCloudStyle,
  buildRevCloud,
  defaultRevCloudArcLength,
  distance2d,
  isRevCloudCloseToStart,
  rectanglePath,
  sampleEntityPath
} from './AcApRevCloudGeom'

type RevCloudMode = 'rectangular' | 'polygonal' | 'freehand'
type RevCloudKeywordKey =
  | 'arcLength'
  | 'object'
  | 'rectangular'
  | 'polygonal'
  | 'freehand'
  | 'style'
  | 'normal'
  | 'calligraphy'
  | 'undo'
  | 'yes'
  | 'no'

interface RevCloudSettings {
  mode: RevCloudMode
  arcLength?: number
  style: AcApRevCloudStyle
  variance: boolean
}

const DEFAULT_SETTINGS: RevCloudSettings = {
  mode: 'rectangular',
  style: 'normal',
  variance: true
}

function addKeyword(
  prompt: AcEdPromptPointOptions | AcEdPromptKeywordOptions,
  key: RevCloudKeywordKey
) {
  prompt.keywords.add(
    AcApI18n.t(`jig.revcloud.keywords.${key}.display`),
    AcApI18n.t(`jig.revcloud.keywords.${key}.global`),
    AcApI18n.t(`jig.revcloud.keywords.${key}.local`)
  )
}

function toPoint2d(point: AcGePoint2dLike): AcGePoint2d {
  return new AcGePoint2d(point.x, point.y)
}

function applyCloud(
  cloud: AcDbPolyline,
  path: AcGePoint2dLike[],
  closed: boolean,
  settings: RevCloudSettings,
  reverse = false
) {
  return buildRevCloud(cloud, path, closed, {
    arcLength: settings.arcLength ?? 1,
    style: settings.style,
    variance: settings.variance,
    reverse
  })
}

/**
 * Live preview for rectangular / polygonal / freehand revision clouds.
 */
export class AcApRevCloudJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _cloud: AcDbPolyline
  private _path: AcGePoint2d[]
  private _closed: boolean
  private _settings: RevCloudSettings

  constructor(
    view: AcEdBaseView,
    path: AcGePoint2dLike[],
    closed: boolean,
    settings: RevCloudSettings
  ) {
    super(view)
    this._cloud = new AcDbPolyline()
    this._path = path.map(toPoint2d)
    this._closed = closed
    this._settings = settings
    this.rebuild()
  }

  get entity(): AcDbPolyline {
    return this._cloud
  }

  updatePath(path: AcGePoint2dLike[], closed: boolean) {
    this._path = path.map(toPoint2d)
    this._closed = closed
    this.rebuild()
  }

  update(point: AcGePoint2dLike) {
    if (this._path.length === 0) return
    const preview = [...this._path, toPoint2d(point)]
    const closed = this._closed && preview.length >= 3
    applyCloud(this._cloud, preview, closed, this._settings)
  }

  private rebuild() {
    if (this._path.length < 2) {
      this._cloud.reset(false)
      return
    }
    applyCloud(this._cloud, this._path, this._closed, this._settings)
  }
}

class AcApRevCloudRectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _cloud: AcDbPolyline
  private _firstPoint: AcGePoint2d
  private _settings: RevCloudSettings

  constructor(
    view: AcEdBaseView,
    start: AcGePoint2dLike,
    settings: RevCloudSettings
  ) {
    super(view)
    this._cloud = new AcDbPolyline()
    this._firstPoint = toPoint2d(start)
    this._settings = settings
  }

  get entity(): AcDbPolyline {
    return this._cloud
  }

  update(secondPoint: AcGePoint2dLike) {
    applyCloud(
      this._cloud,
      rectanglePath(this._firstPoint, secondPoint),
      true,
      this._settings
    )
  }
}

class AcApRevCloudFreehandJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _cloud: AcDbPolyline
  private _points: AcGePoint2d[]
  private _settings: RevCloudSettings
  private _closed = false

  constructor(
    view: AcEdBaseView,
    start: AcGePoint2dLike,
    settings: RevCloudSettings
  ) {
    super(view)
    this._cloud = new AcDbPolyline()
    this._points = [toPoint2d(start)]
    this._settings = settings
  }

  get entity(): AcDbPolyline {
    return this._cloud
  }

  get points(): AcGePoint2d[] {
    return this._points
  }

  get closed(): boolean {
    return this._closed
  }

  addPoint(point: AcGePoint2dLike) {
    const next = toPoint2d(point)
    const last = this._points[this._points.length - 1]
    if (last && distance2d(last, next) < 1e-8) return
    this._points.push(next)
  }

  update(current: AcGePoint2dLike) {
    const arcLength = this._settings.arcLength ?? 1
    const last = this._points[this._points.length - 1]
    if (last && distance2d(last, current) >= arcLength) {
      this._points.push(toPoint2d(current))
    }

    this._closed =
      this._points.length >= 3 &&
      isRevCloudCloseToStart(this._points[0], current, arcLength)

    const preview = this._closed
      ? this._points
      : [...this._points, toPoint2d(current)]
    applyCloud(this._cloud, preview, this._closed, this._settings)
  }
}

/**
 * Static cloud preview used while prompting for Reverse direction.
 *
 * Keyword prompts do not drive jig updates, so this jig keeps the finished
 * cloud visible and rebuilds it when the user toggles reverse.
 */
class AcApRevCloudStaticJig extends AcEdPreviewJig<string> {
  private _cloud: AcDbPolyline
  private _path: AcGePoint2dLike[]
  private _closed: boolean
  private _settings: RevCloudSettings
  private _reverse = false
  private _valid: boolean

  constructor(
    view: AcEdBaseView,
    path: AcGePoint2dLike[],
    closed: boolean,
    settings: RevCloudSettings
  ) {
    super(view)
    this._cloud = new AcDbPolyline()
    this._path = path
    this._closed = closed
    this._settings = settings
    this._valid = applyCloud(this._cloud, path, closed, settings)
  }

  get entity(): AcDbPolyline {
    return this._cloud
  }

  get valid(): boolean {
    return this._valid
  }

  get reverse(): boolean {
    return this._reverse
  }

  update(_value: string) {
    // Keyword prompt: geometry is rebuilt only when reverse is toggled.
  }

  toggleReverse() {
    this._reverse = !this._reverse
    this._valid = applyCloud(
      this._cloud,
      this._path,
      this._closed,
      this._settings,
      this._reverse
    )
    this.render()
  }
}

/**
 * Command to create a revision cloud, aligned with AutoCAD REVCLOUD.
 *
 * Supports Rectangular (default), Polygonal, Freehand, Object conversion,
 * Arc length, Style (Normal/Calligraphy), and Reverse direction.
 */
export class AcApRevCloudCmd extends AcEdCommand {
  private static _settings: RevCloudSettings = { ...DEFAULT_SETTINGS }

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const settings = AcApRevCloudCmd._settings
    if (settings.arcLength == null) {
      settings.arcLength = defaultRevCloudArcLength(context.view)
    }

    while (true) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.revcloud.firstCornerOrOptions')
      )
      addKeyword(prompt, 'arcLength')
      addKeyword(prompt, 'object')
      const rectangular = prompt.keywords.add(
        AcApI18n.t('jig.revcloud.keywords.rectangular.display'),
        AcApI18n.t('jig.revcloud.keywords.rectangular.global'),
        AcApI18n.t('jig.revcloud.keywords.rectangular.local')
      )
      const polygonal = prompt.keywords.add(
        AcApI18n.t('jig.revcloud.keywords.polygonal.display'),
        AcApI18n.t('jig.revcloud.keywords.polygonal.global'),
        AcApI18n.t('jig.revcloud.keywords.polygonal.local')
      )
      const freehand = prompt.keywords.add(
        AcApI18n.t('jig.revcloud.keywords.freehand.display'),
        AcApI18n.t('jig.revcloud.keywords.freehand.global'),
        AcApI18n.t('jig.revcloud.keywords.freehand.local')
      )
      addKeyword(prompt, 'style')
      prompt.keywords.default =
        settings.mode === 'polygonal'
          ? polygonal
          : settings.mode === 'freehand'
            ? freehand
            : rectangular

      const result = await AcApDocManager.instance.editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Keyword) {
        const keyword = result.stringResult ?? ''
        if (keyword === 'ArcLength') {
          const accepted = await this.promptArcLength(settings)
          if (!accepted) return
          continue
        }
        if (keyword === 'Object') {
          await this.convertObject(context, settings)
          return
        }
        if (keyword === 'Rectangular') {
          settings.mode = 'rectangular'
          await this.drawRectangular(context, settings)
          return
        }
        if (keyword === 'Polygonal') {
          settings.mode = 'polygonal'
          await this.drawPolygonal(context, settings)
          return
        }
        if (keyword === 'Freehand') {
          settings.mode = 'freehand'
          await this.drawFreehand(context, settings)
          return
        }
        if (keyword === 'Style') {
          const accepted = await this.promptStyle(settings)
          if (!accepted) return
          continue
        }
        continue
      }

      if (result.status !== AcEdPromptStatus.OK || !result.value) return

      if (settings.mode === 'polygonal') {
        await this.drawPolygonal(context, settings, result.value)
      } else if (settings.mode === 'freehand') {
        await this.drawFreehand(context, settings, result.value)
      } else {
        await this.drawRectangular(context, settings, result.value)
      }
      return
    }
  }

  private async promptArcLength(settings: RevCloudSettings) {
    const prompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.revcloud.arcLength')
    )
    prompt.allowNegative = false
    prompt.allowZero = false
    prompt.useDefaultValue = settings.arcLength != null
    prompt.defaultValue = settings.arcLength ?? 1
    const result = await AcApDocManager.instance.editor.getDistance(prompt)
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.None
    ) {
      return false
    }
    const value = result.value ?? prompt.defaultValue
    if (!AcGeTol.isPositive(value)) {
      this.showMessage(AcApI18n.t('jig.revcloud.invalidArcLength'), 'warning')
      return true
    }
    settings.arcLength = value
    return true
  }

  private async promptStyle(settings: RevCloudSettings) {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.revcloud.style')
    )
    prompt.allowNone = true
    const normal = prompt.keywords.add(
      AcApI18n.t('jig.revcloud.keywords.normal.display'),
      AcApI18n.t('jig.revcloud.keywords.normal.global'),
      AcApI18n.t('jig.revcloud.keywords.normal.local')
    )
    const calligraphy = prompt.keywords.add(
      AcApI18n.t('jig.revcloud.keywords.calligraphy.display'),
      AcApI18n.t('jig.revcloud.keywords.calligraphy.global'),
      AcApI18n.t('jig.revcloud.keywords.calligraphy.local')
    )
    prompt.keywords.default =
      settings.style === 'calligraphy' ? calligraphy : normal
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return false
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      if (result.stringResult === 'Calligraphy') {
        settings.style = 'calligraphy'
      } else if (result.stringResult === 'Normal') {
        settings.style = 'normal'
      }
    }
    return true
  }

  private async drawRectangular(
    context: AcApContext,
    settings: RevCloudSettings,
    firstPoint?: AcGePoint2dLike
  ) {
    const start = firstPoint ?? (await this.promptPoint('firstCorner'))
    if (!start) return

    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.revcloud.oppositeCorner')
    )
    prompt.useBasePoint = true
    prompt.basePoint = new AcGePoint3d(start.x, start.y, 0)
    prompt.useDashedLine = false
    prompt.jig = new AcApRevCloudRectJig(context.view, start, settings)
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status !== AcEdPromptStatus.OK || !result.value) return

    const path = rectanglePath(start, result.value)
    if (
      AcGeTol.equalToZero(path[0].x - path[1].x) ||
      AcGeTol.equalToZero(path[0].y - path[3].y)
    ) {
      return
    }
    await this.commitCloud(context, path, true, settings)
  }

  private async drawPolygonal(
    context: AcApContext,
    settings: RevCloudSettings,
    firstPoint?: AcGePoint2dLike
  ) {
    const start = firstPoint ?? (await this.promptPoint('startPoint'))
    if (!start) return

    const points: AcGePoint2d[] = [toPoint2d(start)]
    type PolyState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    class NextPointState implements PolyState {
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t(
            points.length >= 2
              ? 'jig.revcloud.nextPointOrUndo'
              : 'jig.revcloud.nextPoint'
          )
        )
        if (points.length >= 2) {
          addKeyword(prompt, 'undo')
        }
        prompt.useDashedLine = false
        prompt.useBasePoint = true
        const current = points[points.length - 1]
        prompt.basePoint = new AcGePoint3d(current.x, current.y, 0)
        prompt.allowNone = points.length >= 3
        prompt.jig = new AcApRevCloudJig(context.view, points, true, settings)
        return prompt
      }

      async handleResult(
        result: AcEdPromptPointResult
      ): Promise<AcEdPromptStateStep> {
        if (result.status === AcEdPromptStatus.Keyword) {
          if (result.stringResult === 'Undo' && points.length > 1) {
            points.pop()
          }
          return 'continue'
        }
        if (result.status === AcEdPromptStatus.OK && result.value) {
          points.push(toPoint2d(result.value))
          return 'continue'
        }
        return 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new NextPointState())
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    if (points.length < 3) return
    await this.commitCloud(context, points, true, settings)
  }

  private async drawFreehand(
    context: AcApContext,
    settings: RevCloudSettings,
    firstPoint?: AcGePoint2dLike
  ) {
    const start = firstPoint ?? (await this.promptPoint('firstPoint'))
    if (!start) return

    const jig = new AcApRevCloudFreehandJig(context.view, start, settings)
    const arcLength = settings.arcLength ?? 1

    while (true) {
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.revcloud.guideCursor')
      )
      prompt.jig = jig
      prompt.useDashedLine = false
      prompt.useBasePoint = true
      prompt.basePoint = new AcGePoint3d(start.x, start.y, 0)
      prompt.allowNone = true
      prompt.disableOSnap = true
      const result = await AcApDocManager.instance.editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.Cancel) return
      if (result.status === AcEdPromptStatus.None) {
        if (jig.points.length < 2) return
        await this.commitCloud(context, jig.points, jig.closed, settings)
        return
      }
      if (result.status !== AcEdPromptStatus.OK || !result.value) return

      if (
        jig.points.length >= 3 &&
        isRevCloudCloseToStart(jig.points[0], result.value, arcLength)
      ) {
        await this.commitCloud(context, jig.points, true, settings)
        return
      }
      jig.addPoint(result.value)
    }
  }

  private async convertObject(
    context: AcApContext,
    settings: RevCloudSettings
  ) {
    while (true) {
      const prompt = new AcEdPromptEntityOptions(
        AcApI18n.t('jig.revcloud.selectObject')
      )
      prompt.setRejectMessage(AcApI18n.t('jig.revcloud.invalidObject'))
      prompt.addAllowedClass('Polyline')
      prompt.addAllowedClass('Circle')
      prompt.addAllowedClass('Ellipse')
      prompt.addAllowedClass('Spline')
      const result = await AcApDocManager.instance.editor.getEntity(prompt)
      if (result.status !== AcEdPromptStatus.OK || !result.objectId) return

      const entity = context.doc.database.openEntityForRead(result.objectId)
      if (!entity) return
      const sampled = sampleEntityPath(entity, (settings.arcLength ?? 1) * 0.5)
      if (!sampled) {
        this.showMessage(AcApI18n.t('jig.revcloud.invalidObject'), 'warning')
        continue
      }

      const committed = await this.commitCloud(
        context,
        sampled.points,
        sampled.closed,
        settings
      )
      if (committed) {
        this.eraseEntity(context, entity)
      }
      return
    }
  }

  private async commitCloud(
    context: AcApContext,
    path: AcGePoint2dLike[],
    closed: boolean,
    settings: RevCloudSettings
  ) {
    const preview = new AcApRevCloudStaticJig(
      context.view,
      path,
      closed,
      settings
    )
    if (!preview.valid) return false

    try {
      // Keep the finished cloud visible during Reverse direction. Keyword
      // prompts do not refresh jigs, so render it explicitly and rebuild when
      // the user chooses Yes.
      while (true) {
        preview.render()
        if (!(await this.promptReverse(preview))) break
        preview.toggleReverse()
      }

      const cloud = new AcDbPolyline()
      if (!applyCloud(cloud, path, closed, settings, preview.reverse)) {
        return false
      }
      context.doc.database.tables.blockTable.modelSpace.appendEntity(cloud)
      return true
    } finally {
      preview.end()
    }
  }

  private async promptReverse(preview: AcApRevCloudStaticJig) {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.revcloud.reverseDirection')
    )
    prompt.jig = preview
    prompt.allowNone = true
    addKeyword(prompt, 'yes')
    const no = prompt.keywords.add(
      AcApI18n.t('jig.revcloud.keywords.no.display'),
      AcApI18n.t('jig.revcloud.keywords.no.global'),
      AcApI18n.t('jig.revcloud.keywords.no.local')
    )
    prompt.keywords.default = no
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    return (
      (result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
      result.stringResult === 'Yes'
    )
  }

  private async promptPoint(
    messageKey: 'firstCorner' | 'startPoint' | 'firstPoint'
  ) {
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t(`jig.revcloud.${messageKey}`)
    )
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status !== AcEdPromptStatus.OK || !result.value) return undefined
    return result.value
  }

  private eraseEntity(context: AcApContext, entity: AcDbEntity) {
    entity.erase()
    context.view.removeEntity(entity)
  }
}
