import {
  AcDbArc,
  AcDbCircle,
  AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbHatchStyle,
  AcDbLine,
  AcDbObjectId,
  AcDbPolyline,
  AcGeBoundaryEdgeType,
  AcGeCircArc2d,
  AcGeLine2d,
  AcGeLoop2d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDoubleOptions,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Persisted HATCH command options reused between command invocations.
 */
export interface HatchSettings {
  /** Hatch pattern name, e.g. `ANSI31` or `SOLID`. */
  patternName: string
  /** Pattern scale factor in drawing units (must be positive). */
  patternScale: number
  /** Pattern angle in degrees, converted to radians when writing entity data. */
  patternAngleDeg: number
  /** Hatch style that controls island handling behavior. */
  style: AcDbHatchStyle
  /** Whether the command should operate in associative mode. */
  associative: boolean
}

/**
 * Computed loop metadata used for pick-point seed resolution.
 *
 * The command samples each loop to polygon points, computes an absolute area,
 * and builds a parent/child containment tree so one seed point can map to
 * the appropriate loop set.
 */
interface LoopInfo {
  /** Original geometric loop object used by {@link AcDbHatch.add}. */
  loop: AcGeLoop2d
  /** Segmented loop points used for point-in-polygon and area operations. */
  points: Array<{ x: number; y: number }>
  /** Absolute loop area derived from signed polygon area. */
  area: number
  /** Parent loop index in the loop info array; `null` means top-level loop. */
  parent: number | null
  /** Child loop indices contained directly by this loop. */
  children: number[]
}

/**
 * Command-line HATCH command (no dialog), inspired by AutoCAD flow.
 *
 * Current scope:
 * - Build hatch boundaries from selected objects.
 * - Support command-line option branches (pattern/scale/angle/style/associative).
 * - No island-detection refinement beyond loop construction.
 */
export class AcApHatchCmd extends AcEdCommand {
  /**
   * Last-used command settings shared by all `AcApHatchCmd` instances.
   */
  private static _lastSettings: HatchSettings = {
    patternName: 'SOLID',
    patternScale: 1,
    patternAngleDeg: 0,
    style: AcDbHatchStyle.Normal,
    associative: true
  }

  /**
   * Creates one HATCH command instance and marks it as write-mode only.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Current settings used by this command instance when creating hatches.
   */
  protected get settings(): HatchSettings {
    return AcApHatchCmd._lastSettings
  }

  /**
   * Normalizes pattern name input.
   *
   * @param value Raw user-entered pattern name.
   * @returns Trimmed name, or `SOLID` when input is empty.
   */
  protected normalizePatternName(value: string) {
    const name = value.trim().toUpperCase()
    return name.length > 0 ? name : 'SOLID'
  }

  /**
   * Converts hatch style enum to command keyword string.
   *
   * @param style Hatch style enum value.
   * @returns Command keyword name used by keyword prompts.
   */
  protected styleToKeyword(style: AcDbHatchStyle) {
    switch (style) {
      case AcDbHatchStyle.Outer:
        return 'Outer'
      case AcDbHatchStyle.Ignore:
        return 'Ignore'
      case AcDbHatchStyle.Normal:
      default:
        return 'Normal'
    }
  }

  /**
   * Converts command keyword string to hatch style enum.
   *
   * @param keyword Keyword returned by prompt API.
   * @returns Matching hatch style enum, defaulting to `Normal`.
   */
  protected keywordToStyle(keyword: string) {
    switch (keyword) {
      case 'Outer':
        return AcDbHatchStyle.Outer
      case 'Ignore':
        return AcDbHatchStyle.Ignore
      case 'Normal':
      default:
        return AcDbHatchStyle.Normal
    }
  }

  /**
   * Converts a closed polyline entity into a boundary-edge sequence.
   *
   * The function keeps arc segments by reading per-vertex bulge values.
   * If runtime bulge data is unavailable, vertices fall back to straight edges.
   *
   * @param entity Input polyline entity.
   * @returns Ordered boundary edges or empty array if not hatchable.
   */
  private buildEdgesFromPolyline(entity: AcDbPolyline): AcGeBoundaryEdgeType[] {
    if (!entity.closed || entity.numberOfVertices < 2) return []

    // Runtime polyline geometry keeps bulge data; typed API does not expose it.
    const runtimeVertices = (
      entity as unknown as {
        _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
      }
    )._geo?.vertices

    const vertices =
      runtimeVertices && runtimeVertices.length > 1
        ? runtimeVertices.map(v => ({ x: v.x, y: v.y, bulge: v.bulge }))
        : Array.from({ length: entity.numberOfVertices }, (_, i) => {
            const p = entity.getPoint2dAt(i)
            return { x: p.x, y: p.y, bulge: 0 }
          })

    if (vertices.length < 2) return []

    const edges: AcGeBoundaryEdgeType[] = []
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i]
      const end = vertices[(i + 1) % vertices.length]
      const bulge = start.bulge ?? 0
      if (Math.abs(bulge) > 1e-12) {
        edges.push(new AcGeCircArc2d(start, end, bulge))
      } else {
        edges.push(new AcGeLine2d(start, end))
      }
    }
    return edges
  }

  /**
   * Converts a supported boundary entity into one or more boundary edges.
   *
   * Supported entities:
   * - `AcDbPolyline` (closed)
   * - `AcDbCircle`
   * - `AcDbArc` (closed only)
   * - `AcDbLine`
   *
   * @param entity Input entity from model space.
   * @returns Edge list consumable by loop builder.
   */
  private buildEdgesFromEntity(entity: AcDbEntity): AcGeBoundaryEdgeType[] {
    if (entity instanceof AcDbPolyline) {
      return this.buildEdgesFromPolyline(entity)
    }

    if (entity instanceof AcDbCircle) {
      const center = entity.center
      return [
        new AcGeCircArc2d(
          { x: center.x, y: center.y },
          entity.radius,
          0,
          Math.PI * 2,
          false
        )
      ]
    }

    if (entity instanceof AcDbArc) {
      if (!entity.closed) return []
      const center = entity.center
      return [
        new AcGeCircArc2d(
          { x: center.x, y: center.y },
          entity.radius,
          entity.startAngle,
          entity.endAngle,
          false
        )
      ]
    }

    if (entity instanceof AcDbLine) {
      return [new AcGeLine2d(entity.startPoint, entity.endPoint)]
    }

    return []
  }

  /**
   * Builds closed loops from explicit object ids.
   *
   * @param context Active command context.
   * @param ids Object ids selected by the user.
   * @returns Closed loops ready for hatch creation.
   */
  protected collectLoopsFromIds(context: AcApContext, ids: AcDbObjectId[]) {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    const edges: AcGeBoundaryEdgeType[] = []

    ids.forEach(id => {
      const entity = modelSpace.getIdAt(id)
      if (!entity) return
      edges.push(...this.buildEdgesFromEntity(entity))
    })

    return this.buildLoopsFromEdges(edges)
  }

  /**
   * Scans model space and builds closed loops from all supported boundaries.
   *
   * This is used by pick-points mode so a seed point can be resolved against
   * all potential loops in the drawing.
   *
   * @param context Active command context.
   * @returns Closed loops derived from all hatchable entities.
   */
  protected collectLoopsFromAllBoundaries(context: AcApContext) {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    const edges: AcGeBoundaryEdgeType[] = []
    for (const entity of modelSpace.newIterator()) {
      edges.push(...this.buildEdgesFromEntity(entity))
    }
    return this.buildLoopsFromEdges(edges)
  }

  /**
   * Builds best-effort closed loops from boundary edges.
   *
   * The loop solver is retried with increasing tolerance values and the best
   * (largest) closed-loop result set is returned.
   *
   * @param edges Input boundary edge set.
   * @returns Closed loops produced by the best tolerance attempt.
   */
  private buildLoopsFromEdges(edges: ReadonlyArray<AcGeBoundaryEdgeType>) {
    if (edges.length === 0) return []

    // Try from strict to loose tolerance, and keep the best closed-loop result.
    const tolerances = [1e-6, 1e-5, 1e-4, 1e-3]
    let best: AcGeLoop2d[] = []
    for (const tolerance of tolerances) {
      const loops = AcGeLoop2d.buildFromEdges(edges, tolerance).filter(
        loop => loop.closed && loop.numberOfEdges > 0
      )
      if (loops.length > best.length) {
        best = loops
      }
    }
    return best
  }

  /**
   * Calculates polygon signed area using the shoelace formula.
   *
   * @param points Polygon vertices.
   * @returns Signed area; positive/negative sign depends on winding direction.
   */
  private signedArea(points: Array<{ x: number; y: number }>) {
    if (points.length < 3) return 0
    let sum = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const p1 = points[j]
      const p2 = points[i]
      sum += p1.x * p2.y - p2.x * p1.y
    }
    return sum * 0.5
  }

  /**
   * Tests whether one point lies on a finite segment within a tolerance.
   *
   * @param px Test point X.
   * @param py Test point Y.
   * @param ax Segment start X.
   * @param ay Segment start Y.
   * @param bx Segment end X.
   * @param by Segment end Y.
   * @param tolerance Distance tolerance.
   * @returns `true` if point is on segment; otherwise `false`.
   */
  private isPointOnSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    tolerance = 1e-8
  ) {
    const abx = bx - ax
    const aby = by - ay
    const apx = px - ax
    const apy = py - ay
    const cross = Math.abs(abx * apy - aby * apx)
    if (cross > tolerance) return false
    const dot = apx * abx + apy * aby
    if (dot < -tolerance) return false
    const len2 = abx * abx + aby * aby
    if (dot - len2 > tolerance) return false
    return true
  }

  /**
   * Determines whether a point is inside (or on boundary of) a polygon.
   *
   * Boundary points are treated as inside to keep seed-point behavior stable
   * near loop edges.
   *
   * @param point Test point.
   * @param polygon Polygon vertices.
   * @returns `true` when inside or on boundary.
   */
  private isPointInPolygon(
    point: { x: number; y: number },
    polygon: Array<{ x: number; y: number }>
  ) {
    if (polygon.length < 3) return false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[j]
      const b = polygon[i]
      if (this.isPointOnSegment(point.x, point.y, a.x, a.y, b.x, b.y)) {
        return true
      }
    }

    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y
      const intersects =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi
      if (intersects) inside = !inside
    }
    return inside
  }

  /**
   * Builds loop metadata and parent/child containment relationships.
   *
   * @param loops Candidate closed loops.
   * @returns Loop info array with area and hierarchy metadata.
   */
  private buildLoopInfos(loops: ReadonlyArray<AcGeLoop2d>): LoopInfo[] {
    const infos: LoopInfo[] = []
    loops.forEach(loop => {
      const points = loop.getPoints(128).map(p => ({ x: p.x, y: p.y }))
      if (points.length < 3) return
      infos.push({
        loop,
        points,
        area: Math.abs(this.signedArea(points)),
        parent: null,
        children: []
      })
    })

    for (let i = 0; i < infos.length; i++) {
      const sample = infos[i].points[0]
      let parentIndex: number | null = null
      let parentArea = Number.POSITIVE_INFINITY

      for (let j = 0; j < infos.length; j++) {
        if (i === j) continue
        if (infos[j].area <= infos[i].area) continue
        if (!this.isPointInPolygon(sample, infos[j].points)) continue
        if (infos[j].area < parentArea) {
          parentArea = infos[j].area
          parentIndex = j
        }
      }

      infos[i].parent = parentIndex
      if (parentIndex != null) {
        infos[parentIndex].children.push(i)
      }
    }

    return infos
  }

  /**
   * Resolves which loops should be used for one pick-point seed.
   *
   * Strategy:
   * - Find the smallest containing loop as target.
   * - Include direct children as holes unless style is `Ignore`.
   *
   * @param point Seed point selected by user.
   * @param loops Candidate loops.
   * @returns Ordered loop set to append into one hatch entity.
   */
  protected resolveLoopsForPickPoint(
    point: { x: number; y: number },
    loops: ReadonlyArray<AcGeLoop2d>
  ) {
    const infos = this.buildLoopInfos(loops)
    if (!infos.length) return []

    const containing = infos
      .map((info, index) =>
        this.isPointInPolygon(point, info.points) ? index : -1
      )
      .filter(index => index >= 0)

    if (!containing.length) return []

    containing.sort((a, b) => infos[a].area - infos[b].area)
    const target = containing[0]
    const selected = new Set<number>([target])

    // Pick-points mode should hatch the region connected to the picked seed.
    // Use target loop as outer boundary and its direct children as holes.
    if (this.settings.style !== AcDbHatchStyle.Ignore) {
      infos[target].children.forEach(child => selected.add(child))
    }

    return [...selected].map(index => infos[index].loop)
  }

  /**
   * Creates and appends one hatch entity from computed loops.
   *
   * @param context Active command context.
   * @param loops Boundary loops to be added to the hatch.
   * @returns `true` when hatch entity was created; otherwise `false`.
   */
  protected appendHatch(
    context: AcApContext,
    loops: ReadonlyArray<AcGeLoop2d>
  ) {
    if (!loops.length) return false

    const hatch = new AcDbHatch()
    const settings = this.settings
    const patternName = this.normalizePatternName(settings.patternName)
    const isSolidFill = patternName === 'SOLID'
    hatch.patternName = patternName
    hatch.patternType = AcDbHatchPatternType.Predefined
    hatch.patternScale = settings.patternScale
    hatch.patternAngle = (settings.patternAngleDeg * Math.PI) / 180
    hatch.hatchStyle = settings.style
    hatch.isSolidFill = isSolidFill
    this.configureHatch(hatch)

    loops.forEach(loop => hatch.add(loop))
    context.doc.database.tables.blockTable.modelSpace.appendEntity(hatch)
    return true
  }

  /**
   * Allows specialized hatch commands to apply additional entity properties
   * before the hatch is added to model space.
   *
   * @param _hatch Hatch entity being created.
   */
  protected configureHatch(_hatch: AcDbHatch) {}

  /**
   * Prompts for pattern name and updates persisted command settings.
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptPatternName() {
    const strOptions = new AcEdPromptStringOptions(
      AcApI18n.t('jig.hatch.patternName')
    )
    strOptions.allowEmpty = false
    const settings = this.settings
    strOptions.defaultValue = settings.patternName
    strOptions.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getString(strOptions)
    if (result.status !== AcEdPromptStatus.OK) return
    settings.patternName = this.normalizePatternName(
      result.stringResult ?? strOptions.defaultValue
    )
  }

  /**
   * Prompts for pattern scale and updates persisted command settings.
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptPatternScale() {
    const options = new AcEdPromptDoubleOptions(AcApI18n.t('jig.hatch.scale'))
    options.allowNone = true
    options.allowNegative = false
    options.allowZero = false
    const settings = this.settings
    options.defaultValue = settings.patternScale
    options.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getDouble(options)
    if (result.status !== AcEdPromptStatus.OK) return
    const value = result.value ?? options.defaultValue
    if (value > 0) {
      settings.patternScale = value
    }
  }

  /**
   * Prompts for pattern angle (degrees) and updates persisted settings.
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptPatternAngle() {
    const options = new AcEdPromptDoubleOptions(AcApI18n.t('jig.hatch.angle'))
    options.allowNone = true
    options.allowNegative = true
    options.allowZero = true
    const settings = this.settings
    options.defaultValue = settings.patternAngleDeg
    options.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getDouble(options)
    if (result.status !== AcEdPromptStatus.OK) return
    settings.patternAngleDeg = result.value ?? options.defaultValue
  }

  /**
   * Prompts for hatch style (`Normal` / `Outer` / `Ignore`).
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptStyle() {
    const settings = this.settings
    const current = this.styleToKeyword(settings.style)
    const options = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.hatch.style')} <${current}>`
    )
    options.allowNone = true
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.normal.display'),
      AcApI18n.t('jig.hatch.keywords.normal.global'),
      AcApI18n.t('jig.hatch.keywords.normal.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.outer.display'),
      AcApI18n.t('jig.hatch.keywords.outer.global'),
      AcApI18n.t('jig.hatch.keywords.outer.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.ignore.display'),
      AcApI18n.t('jig.hatch.keywords.ignore.global'),
      AcApI18n.t('jig.hatch.keywords.ignore.local')
    )

    const result = await AcApDocManager.instance.editor.getKeywords(options)
    if (
      (result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
      result.stringResult
    ) {
      settings.style = this.keywordToStyle(result.stringResult)
    }
  }

  /**
   * Prompts for associative mode switch (`Yes` / `No`).
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptAssociative() {
    const settings = this.settings
    const current = settings.associative ? 'Yes' : 'No'
    const options = new AcEdPromptKeywordOptions(
      `${AcApI18n.t('jig.hatch.associative')} <${current}>`
    )
    options.allowNone = true
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.yes.display'),
      AcApI18n.t('jig.hatch.keywords.yes.global'),
      AcApI18n.t('jig.hatch.keywords.yes.local')
    )
    options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.no.display'),
      AcApI18n.t('jig.hatch.keywords.no.global'),
      AcApI18n.t('jig.hatch.keywords.no.local')
    )
    const result = await AcApDocManager.instance.editor.getKeywords(options)
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      settings.associative = result.stringResult === 'Yes'
    }
  }

  /**
   * Executes object-selection branch of HATCH.
   *
   * @param context Active command context.
   * @returns `true` if a hatch was created from selected objects.
   */
  protected async doSelectObjects(context: AcApContext) {
    const options = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.hatch.select')
    )
    const result = await AcApDocManager.instance.editor.getSelection(options)
    if (result.status !== AcEdPromptStatus.OK || !result.value) return false

    const loops = this.collectLoopsFromIds(context, result.value.ids)
    if (!loops.length) return false
    return this.appendHatch(context, loops)
  }

  /**
   * Executes pick-points branch of HATCH.
   *
   * The user can place multiple seed points. Each accepted point attempts
   * one hatch creation, and pressing Enter terminates this branch.
   *
   * @param context Active command context.
   * @returns `true` if at least one hatch was created.
   */
  protected async doPickPoints(context: AcApContext) {
    const sourceLoops = this.collectLoopsFromAllBoundaries(context)
    if (!sourceLoops.length) return false

    let created = false
    while (true) {
      const pointOptions = new AcEdPromptPointOptions(
        AcApI18n.t('jig.hatch.pickPoint')
      )
      pointOptions.allowNone = true
      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointOptions)
      if (pointResult.status !== AcEdPromptStatus.OK || !pointResult.value)
        break

      const loops = this.resolveLoopsForPickPoint(
        pointResult.value,
        sourceLoops
      )
      if (!loops.length) continue
      if (this.appendHatch(context, loops)) {
        created = true
      }
    }

    return created
  }

  /**
   * Runs the interactive command-line HATCH workflow.
   *
   * Main loop behavior:
   * - Direct entity pick: hatch from picked boundary object.
   * - Keyword branches: pick-points, select-objects, or option editing.
   * - Enter/Cancel: exits command.
   *
   * @param context Active command context.
   * @returns Promise resolved when command ends.
   */
  async execute(context: AcApContext) {
    let running = true
    while (running) {
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

      const result = await AcApDocManager.instance.editor.getEntity(options)
      if (result.status === AcEdPromptStatus.OK && result.objectId) {
        const loops = this.collectLoopsFromIds(context, [result.objectId])
        if (!loops.length) {
          continue
        }
        this.appendHatch(context, loops)
        continue
      }

      if (result.status === AcEdPromptStatus.Keyword) {
        const keyword = result.stringResult ?? ''
        if (keyword === 'PickPoints') {
          await this.doPickPoints(context)
        } else if (keyword === 'SelectObjects') {
          await this.doSelectObjects(context)
        } else if (keyword === 'Pattern') {
          await this.promptPatternName()
        } else if (keyword === 'Scale') {
          await this.promptPatternScale()
        } else if (keyword === 'Angle') {
          await this.promptPatternAngle()
        } else if (keyword === 'HatchStyle') {
          await this.promptStyle()
        } else if (keyword === 'AssociativeMode') {
          await this.promptAssociative()
        }
        continue
      }

      running = false
    }
  }
}
