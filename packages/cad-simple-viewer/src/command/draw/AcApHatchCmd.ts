import {
  AcDbDatabase,
  AcDbEntity,
  AcDbHatch,
  acdbHatchBoundaryEdgesFromEntity,
  AcDbHatchPatternType,
  AcDbHatchStyle,
  AcDbObjectId,
  AcDbPolyline,
  AcDbSystemVariables,
  AcDbSysVarManager,
  type AcDbSysVarType,
  AcGeBoundaryEdgeType,
  acgeBulgeFromCircArc2d,
  AcGeCircArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  type AcGeLoop2dType,
  AcGePoint2d,
  type AcGePoint3dLike,
  AcGePolyline2d,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDoubleOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { acapRunDatabaseEdit } from '../../util/AcApDatabaseEdit.js'
import { AcApHatchQuickPreviewJig } from './AcApHatchQuickPreviewJig.js'

/**
 * Persisted HATCH command options reused between command invocations.
 */
export interface HatchSettings {
  /** Hatch pattern name, e.g. a predefined hatch pattern or `SOLID`. */
  patternName: string
  /** Pattern scale factor in drawing units (must be positive). */
  patternScale: number
  /** Pattern angle in degrees, converted to radians when writing entity data. */
  patternAngleDeg: number
  /** Hatch style that controls island handling behavior. */
  style: AcDbHatchStyle
  /**
   * Whether island detection is enabled (HPISLANDDETECTIONMODE).
   * When false, islands are ignored like AutoCAD "No Island Detection".
   */
  islandDetectionEnabled: boolean
  /** Whether the command should operate in associative mode. */
  associative: boolean
}

/**
 * One hatch boundary path with optional source-boundary soft pointers.
 */
export interface AcApHatchLoopWithSources {
  /** Geometric loop used by {@link AcDbHatch.add}. */
  loop: AcGeLoop2d
  /** Source boundary entity ids for DXF 97/330 when associative. */
  sourceIds: AcDbObjectId[]
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
    patternName: HATCH_PATTERN_SOLID,
    patternScale: 1,
    patternAngleDeg: 0,
    style: AcDbHatchStyle.Normal,
    islandDetectionEnabled: true,
    associative: true
  }

  /**
   * Hatches created during the current command session.
   *
   * Used for live scene feedback and to discard on ESC / Cancel (放弃).
   */
  private readonly _sessionHatches: AcDbHatch[] = []

  /**
   * When true, {@link finishSession} erases session hatches instead of keeping
   * them (AutoCAD: ESC / Cancel discards; Enter / Close accepts).
   */
  private _discardSession = false

  /**
   * Creates one HATCH command instance and marks it as write-mode only.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Resets per-invocation session state before the interactive loop starts.
   */
  protected beginSession() {
    this._sessionHatches.length = 0
    this._discardSession = false
  }

  /**
   * Marks the session so created hatches are erased when the command ends.
   */
  protected markDiscardSession() {
    this._discardSession = true
  }

  /**
   * Accepts or discards session hatches at command exit.
   *
   * Discard removes entities from the database and the view so ESC / 放弃
   * does not leave hatch geometry behind (matching AutoCAD Hatch Creation).
   *
   * @param context Active command context.
   */
  protected finishSession(context: AcApContext) {
    if (this._discardSession) {
      for (const hatch of this._sessionHatches) {
        hatch.erase()
        if (context.view.hasEntity(hatch.objectId)) {
          context.view.removeEntity(hatch)
        }
      }
    }
    this._sessionHatches.length = 0
    this._discardSession = false
  }

  /**
   * Called after a hatch is appended and shown in the view.
   *
   * Ribbon commands override this to track active hatch ids for property edits.
   *
   * @param hatch Newly created hatch entity.
   */
  protected onSessionHatchCreated(hatch: AcDbHatch) {
    this._sessionHatches.push(hatch)
  }

  /**
   * Called after a session hatch is undone or discarded from the view.
   *
   * @param hatch Hatch removed from the session.
   */
  protected onSessionHatchRemoved(_hatch: AcDbHatch) {}

  /**
   * Removes the last hatch created in this command session (AutoCAD Undo).
   *
   * @param context Active command context.
   * @returns `true` when a hatch was removed.
   */
  protected undoLastSessionHatch(context: AcApContext): boolean {
    const hatch = this._sessionHatches.pop()
    if (!hatch) return false
    hatch.erase()
    if (context.view.hasEntity(hatch.objectId)) {
      context.view.removeEntity(hatch)
    }
    this.onSessionHatchRemoved(hatch)
    return true
  }

  /**
   * Hatches created during the active HATCH session (creation only).
   */
  protected get sessionHatches(): ReadonlyArray<AcDbHatch> {
    return this._sessionHatches
  }

  /**
   * Erases one hatch and drops it from the session list when present.
   *
   * @param context Active command context.
   * @param hatch Hatch to erase.
   * @returns `true` when the hatch was erased.
   */
  protected eraseHatchEntity(context: AcApContext, hatch: AcDbHatch): boolean {
    const index = this._sessionHatches.indexOf(hatch)
    if (index >= 0) {
      this._sessionHatches.splice(index, 1)
    }
    hatch.erase()
    if (context.view.hasEntity(hatch.objectId)) {
      context.view.removeEntity(hatch)
    }
    if (index >= 0) {
      this.onSessionHatchRemoved(hatch)
    }
    return true
  }

  /**
   * Maps HPISLANDDETECTION sysvar values to {@link AcDbHatchStyle}.
   *
   * AutoCAD: 0 = Normal, 1 = Outer, 2 = Ignore.
   */
  protected styleFromIslandDetection(value: unknown): AcDbHatchStyle {
    const n = Number(value)
    if (n === 0) return AcDbHatchStyle.Normal
    if (n === 2) return AcDbHatchStyle.Ignore
    return AcDbHatchStyle.Outer
  }

  /**
   * Maps {@link AcDbHatchStyle} to HPISLANDDETECTION sysvar values.
   */
  protected islandDetectionFromStyle(style: AcDbHatchStyle): number {
    switch (style) {
      case AcDbHatchStyle.Normal:
        return 0
      case AcDbHatchStyle.Ignore:
        return 2
      case AcDbHatchStyle.Outer:
      default:
        return 1
    }
  }

  /**
   * Whether new hatches should be separate objects (HPSEPARATE = 1).
   */
  private shouldSeparateHatches(database?: AcDbDatabase): boolean {
    if (!(database instanceof AcDbDatabase)) return false
    try {
      const value = this.getSysVar(
        AcDbSysVarManager.instance(),
        AcDbSystemVariables.HPSEPARATE,
        database
      )
      return Number(value) !== 0
    } catch {
      return false
    }
  }

  /**
   * Current settings used by this command instance when creating hatches.
   */
  protected get settings(): HatchSettings {
    return AcApHatchCmd._lastSettings
  }

  private normalizeSysVarNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private normalizePositiveSysVarNumber(value: unknown, fallback: number) {
    const parsed = this.normalizeSysVarNumber(value, fallback)
    return parsed > 0 ? parsed : fallback
  }

  private sysVarRadiansToDegrees(value: number) {
    return Math.round(((value * 180) / Math.PI) * 1e6) / 1e6
  }

  private getSysVar(
    sysVarManager: AcDbSysVarManager,
    name: string,
    database: AcDbDatabase
  ) {
    try {
      return sysVarManager.getVar(name, database)
    } catch {
      return undefined
    }
  }

  private getDatabaseSysVarSettings(database?: AcDbDatabase): HatchSettings {
    const settings = this.settings
    if (!(database instanceof AcDbDatabase)) return settings

    try {
      const sysVarManager = AcDbSysVarManager.instance()
      const associative = this.getSysVar(
        sysVarManager,
        AcDbSystemVariables.HPASSOC,
        database
      )
      const islandDetection = this.getSysVar(
        sysVarManager,
        AcDbSystemVariables.HPISLANDDETECTION,
        database
      )
      const islandDetectionMode = this.getSysVar(
        sysVarManager,
        AcDbSystemVariables.HPISLANDDETECTIONMODE,
        database
      )
      return {
        ...settings,
        patternName: this.normalizePatternName(
          (this.getSysVar(
            sysVarManager,
            AcDbSystemVariables.HPNAME,
            database
          ) as string) ?? settings.patternName
        ),
        patternScale: this.normalizePositiveSysVarNumber(
          this.getSysVar(sysVarManager, AcDbSystemVariables.HPSCALE, database),
          settings.patternScale
        ),
        patternAngleDeg: this.sysVarRadiansToDegrees(
          this.normalizeSysVarNumber(
            this.getSysVar(sysVarManager, AcDbSystemVariables.HPANG, database),
            (settings.patternAngleDeg * Math.PI) / 180
          )
        ),
        style:
          islandDetection == null
            ? settings.style
            : this.styleFromIslandDetection(islandDetection),
        islandDetectionEnabled:
          islandDetectionMode == null
            ? settings.islandDetectionEnabled
            : Number(islandDetectionMode) !== 0,
        associative:
          associative == null ? settings.associative : Number(associative) !== 0
      }
    } catch {
      return settings
    }
  }

  private getActiveSettings(): HatchSettings {
    return this.getDatabaseSysVarSettings(
      AcApDocManager.instance.curDocument?.database
    )
  }

  private setActiveSysVar(name: string, value: AcDbSysVarType) {
    const database = AcApDocManager.instance.curDocument?.database
    if (!database) return
    AcDbSysVarManager.instance().setVar(name, value, database)
  }

  /**
   * Normalizes pattern name input.
   *
   * @param value Raw user-entered pattern name.
   * @returns Trimmed name, or `SOLID` when input is empty.
   */
  protected normalizePatternName(value: string) {
    const name = value.trim().toUpperCase()
    return name.length > 0 ? name : HATCH_PATTERN_SOLID
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
   * Builds closed loops from explicit object ids, preserving source soft-pointers.
   *
   * Closed single-entity boundaries (polyline / circle / …) keep a 1:1
   * mapping. Remaining multi-entity edges share their contributing ids on
   * each solved loop.
   *
   * @param context Active command context.
   * @param ids Object ids selected by the user.
   * @returns Closed loops with source boundary ids for association.
   */
  protected collectLoopsFromIds(
    context: AcApContext,
    ids: AcDbObjectId[]
  ): AcApHatchLoopWithSources[] {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    const results: AcApHatchLoopWithSources[] = []
    const leftoverEdges: AcGeBoundaryEdgeType[] = []
    const leftoverIds: AcDbObjectId[] = []

    ids.forEach(id => {
      const entity = modelSpace.getIdAt(id)
      if (!entity) return
      const edges = acdbHatchBoundaryEdgesFromEntity(entity)
      if (edges.length === 0) return
      const alone = this.buildLoopsFromEdges(edges)
      if (alone.length === 1 && alone[0].closed) {
        results.push({ loop: alone[0], sourceIds: [id] })
        return
      }
      leftoverEdges.push(...edges)
      leftoverIds.push(id)
    })

    if (leftoverEdges.length > 0) {
      const loops = this.buildLoopsFromEdges(leftoverEdges)
      loops.forEach(loop => {
        results.push({ loop, sourceIds: [...leftoverIds] })
      })
    }

    return results
  }

  /**
   * Scans model space and builds closed loops from all supported boundaries.
   *
   * This is used by pick-points mode so a seed point can be resolved against
   * all potential loops in the drawing. Source ids are not recovered here.
   *
   * @param context Active command context.
   * @returns Closed loops derived from all hatchable entities.
   */
  protected collectLoopsFromAllBoundaries(context: AcApContext) {
    const modelSpace = context.doc.database.tables.blockTable.modelSpace
    const edges: AcGeBoundaryEdgeType[] = []
    for (const entity of modelSpace.newIterator()) {
      edges.push(...acdbHatchBoundaryEdgesFromEntity(entity))
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
    const len2 = abx * abx + aby * aby
    // Closed tessellations repeat the first vertex at the end. A zero-length
    // "segment" would otherwise treat every point as on-boundary (dot==len2==0)
    // and HPQUICKPREVIEW would stick to the smallest such loop.
    if (len2 <= tolerance * tolerance) return false
    const apx = px - ax
    const apy = py - ay
    const cross = Math.abs(abx * apy - aby * apx)
    if (cross > tolerance) return false
    const dot = apx * abx + apy * aby
    if (dot < -tolerance) return false
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
  /**
   * Builds loop metadata used by pick-point resolution and hover preview.
   *
   * @param loops Candidate closed loops.
   * @returns Loop info array with area and hierarchy metadata.
   */
  protected buildLoopInfos(loops: ReadonlyArray<AcGeLoop2d>): LoopInfo[] {
    const infos: LoopInfo[] = []
    loops.forEach(loop => {
      const points = loop.tessellate().map(p => ({ x: p.x, y: p.y }))
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
   * @param loops Candidate loops (ignored when `infos` is provided).
   * @param infos Optional precomputed loop infos (hover preview caches these).
   * @returns Ordered loop set to append into one hatch entity.
   */
  protected resolveLoopsForPickPoint(
    point: { x: number; y: number },
    loops: ReadonlyArray<AcGeLoop2d>,
    infos?: ReadonlyArray<LoopInfo>
  ) {
    const resolvedInfos = infos ?? this.buildLoopInfos(loops)
    if (!resolvedInfos.length) return []

    const containing = resolvedInfos
      .map((info, index) =>
        this.isPointInPolygon(point, info.points) ? index : -1
      )
      .filter(index => index >= 0)

    if (!containing.length) return []

    containing.sort(
      (a, b) => resolvedInfos[a].area - resolvedInfos[b].area
    )
    const target = containing[0]
    const selected = new Set<number>([target])

    // Pick-points mode should hatch the region connected to the picked seed.
    // Normal: outer + islands as holes (odd/even handled by hatchStyle).
    // Outer: outermost area only — outer + direct children as holes.
    // Ignore / No Island Detection: fill through islands (outer path only).
    const settings = this.getActiveSettings()
    const includeIslandsAsHoles =
      settings.islandDetectionEnabled &&
      settings.style !== AcDbHatchStyle.Ignore
    if (includeIslandsAsHoles) {
      resolvedInfos[target].children.forEach(child => selected.add(child))
    }

    return [...selected].map(index => resolvedInfos[index].loop)
  }

  /**
   * Resolves a hatch pattern origin from HPORIGIN / HPORIGINMODE and hatch extents.
   *
   * AutoCAD: mode 0 uses HPORIGIN; modes 1–5 use rectangular boundary extents.
   *
   * @param hatch Hatch whose boundary extents are used for modes 1–5.
   * @param database Drawing database for system variables.
   * @returns Origin point in OCS/WCS XY.
   */
  protected resolveHatchOriginPoint(
    hatch: AcDbHatch,
    database?: AcDbDatabase
  ): { x: number; y: number } {
    const mode = this.getHatchOriginMode(database)
    if (mode >= 1 && mode <= 5) {
      return this.originFromExtents(hatch, mode)
    }
    return this.getHatchOriginSysVar(database)
  }

  /**
   * Current HPORIGINMODE (0–5), defaulting to 0.
   */
  protected getHatchOriginMode(database?: AcDbDatabase): number {
    if (!(database instanceof AcDbDatabase)) return 0
    const value = this.getSysVar(
      AcDbSysVarManager.instance(),
      AcDbSystemVariables.HPORIGINMODE,
      database
    )
    const mode = Math.trunc(Number(value))
    return mode >= 0 && mode <= 5 ? mode : 0
  }

  /**
   * Current HPORIGIN point, defaulting to (0, 0).
   */
  protected getHatchOriginSysVar(database?: AcDbDatabase): {
    x: number
    y: number
  } {
    if (!(database instanceof AcDbDatabase)) return { x: 0, y: 0 }
    const value = this.getSysVar(
      AcDbSysVarManager.instance(),
      AcDbSystemVariables.HPORIGIN,
      database
    )
    if (
      value &&
      typeof value === 'object' &&
      Number.isFinite((value as { x?: number }).x) &&
      Number.isFinite((value as { y?: number }).y)
    ) {
      return {
        x: (value as { x: number }).x,
        y: (value as { y: number }).y
      }
    }
    return { x: 0, y: 0 }
  }

  /**
   * Computes hatch origin from rectangular boundary extents (HPORIGINMODE 1–5).
   *
   * @param hatch Hatch with boundary geometry.
   * @param mode Extents corner/center mode (1–5).
   */
  protected originFromExtents(
    hatch: AcDbHatch,
    mode: number
  ): { x: number; y: number } {
    const box = hatch.geometricExtents
    if (!box || box.isEmpty()) {
      return { x: 0, y: 0 }
    }
    const min = box.min
    const max = box.max
    switch (mode) {
      case 2:
        return { x: max.x, y: min.y }
      case 3:
        return { x: max.x, y: max.y }
      case 4:
        return { x: min.x, y: max.y }
      case 5:
        return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 }
      case 1:
      default:
        return { x: min.x, y: min.y }
    }
  }

  /**
   * Builds an uncommitted hatch entity with current pattern settings.
   *
   * Used by both committed append and HPQUICKPREVIEW transient preview.
   * Does not append to model space or track session hatches.
   *
   * @param context Active command context.
   * @param loops Boundary loops (plain or with source ids).
   * @param options.associative When false, forces non-associative (preview).
   * @returns Hatch entity, or `undefined` when no loops were provided.
   */
  protected createHatchEntity(
    context: AcApContext,
    loops: ReadonlyArray<AcGeLoop2d | AcApHatchLoopWithSources>,
    options: { associative?: boolean } = {}
  ): AcDbHatch | undefined {
    if (!loops.length) return undefined

    const withSources: AcApHatchLoopWithSources[] = loops.map(item => {
      if (item instanceof AcGeLoop2d) {
        return { loop: item, sourceIds: [] }
      }
      return { loop: item.loop, sourceIds: [...item.sourceIds] }
    })

    const hatch = new AcDbHatch()
    hatch.database = context.doc.database
    const settings = this.getDatabaseSysVarSettings(context.doc.database)
    const patternName = this.normalizePatternName(settings.patternName)
    const isSolidFill = patternName === HATCH_PATTERN_SOLID
    hatch.patternName = patternName
    hatch.patternType = AcDbHatchPatternType.Predefined
    hatch.patternScale = settings.patternScale
    hatch.patternAngle = (settings.patternAngleDeg * Math.PI) / 180
    // No Island Detection (mode off) stores Ignore style on the entity.
    hatch.hatchStyle = settings.islandDetectionEnabled
      ? settings.style
      : AcDbHatchStyle.Ignore
    hatch.isSolidFill = isSolidFill
    this.configureHatch(hatch)

    const allowAssociative = options.associative !== false
    const hasSources = withSources.some(entry => entry.sourceIds.length > 0)
    const wantAssociative =
      allowAssociative && settings.associative && hasSources
    hatch.associative = wantAssociative

    withSources.forEach((entry, index) => {
      hatch.add(entry.loop)
      if (wantAssociative && entry.sourceIds.length > 0) {
        hatch.setPathSourceIds(index, entry.sourceIds)
      }
    })
    hatch.originPoint = this.resolveHatchOriginPoint(
      hatch,
      context.doc.database
    )
    return hatch
  }

  /**
   * Appends one or more hatches from collected boundary loops.
   *
   * When HPSEPARATE is on, each distinct source-id group becomes its own hatch
   * (AutoCAD: separate objects for several closed boundaries). Shared leftover
   * edges (outer + holes) stay one hatch.
   *
   * @param context Active command context.
   * @param loops Collected loops with optional source ids.
   * @returns `true` when at least one hatch was created.
   */
  protected appendHatches(
    context: AcApContext,
    loops: ReadonlyArray<AcGeLoop2d | AcApHatchLoopWithSources>
  ): boolean {
    if (!loops.length) return false
    const withSources: AcApHatchLoopWithSources[] = loops.map(item => {
      if (item instanceof AcGeLoop2d) {
        return { loop: item, sourceIds: [] }
      }
      return { loop: item.loop, sourceIds: [...item.sourceIds] }
    })
    if (!this.shouldSeparateHatches(context.doc.database)) {
      return this.appendHatch(context, withSources) != null
    }

    const groups = new Map<string, AcApHatchLoopWithSources[]>()
    for (const entry of withSources) {
      const key = [...entry.sourceIds].map(String).sort().join('\0')
      const group = groups.get(key)
      if (group) {
        group.push(entry)
      } else {
        groups.set(key, [entry])
      }
    }

    let created = false
    for (const group of groups.values()) {
      if (this.appendHatch(context, group)) {
        created = true
      }
    }
    return created
  }

  /**
   * Creates and appends one hatch entity from computed loops.
   *
   * When {@link HatchSettings.associative} is true and at least one path has
   * source ids, the hatch stores DXF 71/97/330 association. Associative mode
   * without recoverable sources (e.g. pick-points) is forced non-associative
   * so grips stay available.
   *
   * Also calls {@link AcEdBaseView.addEntity} immediately so the hatch is
   * visible while the command undo transaction is still open (scene
   * `entityAppended` notify is deferred until commit).
   *
   * @param context Active command context.
   * @param loops Boundary loops (plain or with source ids).
   * @returns Created hatch, or `undefined` when no loops were provided.
   */
  protected appendHatch(
    context: AcApContext,
    loops: ReadonlyArray<AcGeLoop2d | AcApHatchLoopWithSources>
  ): AcDbHatch | undefined {
    const hatch = this.createHatchEntity(context, loops)
    if (!hatch) return undefined

    context.doc.database.tables.blockTable.modelSpace.appendEntity(hatch)
    // Live feedback while the outer command transaction is still recording
    // (same pattern as LINE / SKETCH). hasEntity skips duplicates on commit.
    if (!context.view.hasEntity(hatch.objectId)) {
      context.view.addEntity(hatch)
    }
    this.onSessionHatchCreated(hatch)
    return hatch
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
    const settings = this.getActiveSettings()
    strOptions.defaultValue = settings.patternName
    strOptions.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getString(strOptions)
    if (result.status !== AcEdPromptStatus.OK) return
    const patternName = this.normalizePatternName(
      result.stringResult ?? strOptions.defaultValue
    )
    this.settings.patternName = patternName
    this.setActiveSysVar(AcDbSystemVariables.HPNAME, patternName)
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
    const settings = this.getActiveSettings()
    options.defaultValue = settings.patternScale
    options.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getDouble(options)
    if (result.status !== AcEdPromptStatus.OK) return
    const value = result.value ?? options.defaultValue
    if (value > 0) {
      this.settings.patternScale = value
      this.setActiveSysVar(AcDbSystemVariables.HPSCALE, value)
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
    const settings = this.getActiveSettings()
    options.defaultValue = settings.patternAngleDeg
    options.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getDouble(options)
    if (result.status !== AcEdPromptStatus.OK) return
    const angleDeg = result.value ?? options.defaultValue
    this.settings.patternAngleDeg = angleDeg
    this.setActiveSysVar(AcDbSystemVariables.HPANG, (angleDeg * Math.PI) / 180)
  }

  /**
   * Prompts for hatch style (`Normal` / `Outer` / `Ignore`).
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptStyle() {
    const settings = this.getActiveSettings()
    const current = this.styleToKeyword(settings.style)
    const options = new AcEdPromptKeywordOptions(AcApI18n.t('jig.hatch.style'))
    options.allowNone = true
    const normal = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.normal.display'),
      AcApI18n.t('jig.hatch.keywords.normal.global'),
      AcApI18n.t('jig.hatch.keywords.normal.local')
    )
    const outer = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.outer.display'),
      AcApI18n.t('jig.hatch.keywords.outer.global'),
      AcApI18n.t('jig.hatch.keywords.outer.local')
    )
    const ignore = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.ignore.display'),
      AcApI18n.t('jig.hatch.keywords.ignore.global'),
      AcApI18n.t('jig.hatch.keywords.ignore.local')
    )
    options.keywords.default =
      current === 'Outer' ? outer : current === 'Ignore' ? ignore : normal

    const result = await AcApDocManager.instance.editor.getKeywords(options)
    if (
      (result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
      result.stringResult
    ) {
      const style = this.keywordToStyle(result.stringResult)
      this.settings.style = style
      this.settings.islandDetectionEnabled = true
      this.setActiveSysVar(AcDbSystemVariables.HPISLANDDETECTIONMODE, 1)
      this.setActiveSysVar(
        AcDbSystemVariables.HPISLANDDETECTION,
        this.islandDetectionFromStyle(style)
      )
    }
  }

  /**
   * Prompts the user for a hatch pattern origin point (AutoCAD Set Origin).
   *
   * @returns Picked point, or `undefined` when cancelled.
   */
  protected async promptHatchOriginPoint(): Promise<
    { x: number; y: number } | undefined
  > {
    const options = new AcEdPromptPointOptions(
      AcApI18n.t('jig.hatch.originPoint')
    )
    const result = await AcApDocManager.instance.editor.getPoint(options)
    if (result.status !== AcEdPromptStatus.OK || !result.value) {
      return undefined
    }
    return { x: result.value.x, y: result.value.y }
  }

  /**
   * Prompts for separate-hatches mode (`Yes` / `No`), mapped to HPSEPARATE.
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptSeparate() {
    const database = AcApDocManager.instance.curDocument?.database
    const separate = this.shouldSeparateHatches(database)
    const options = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.hatch.separate')
    )
    options.allowNone = true
    const yes = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.yes.display'),
      AcApI18n.t('jig.hatch.keywords.yes.global'),
      AcApI18n.t('jig.hatch.keywords.yes.local')
    )
    const no = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.no.display'),
      AcApI18n.t('jig.hatch.keywords.no.global'),
      AcApI18n.t('jig.hatch.keywords.no.local')
    )
    options.keywords.default = separate ? yes : no
    const result = await AcApDocManager.instance.editor.getKeywords(options)
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      this.setActiveSysVar(
        AcDbSystemVariables.HPSEPARATE,
        result.stringResult === 'Yes' ? 1 : 0
      )
    }
  }

  /**
   * Prompts for associative mode switch (`Yes` / `No`).
   *
   * @returns Promise resolved when prompt flow completes.
   */
  protected async promptAssociative() {
    const settings = this.getActiveSettings()
    const options = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.hatch.associative')
    )
    options.allowNone = true
    const yes = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.yes.display'),
      AcApI18n.t('jig.hatch.keywords.yes.global'),
      AcApI18n.t('jig.hatch.keywords.yes.local')
    )
    const no = options.keywords.add(
      AcApI18n.t('jig.hatch.keywords.no.display'),
      AcApI18n.t('jig.hatch.keywords.no.global'),
      AcApI18n.t('jig.hatch.keywords.no.local')
    )
    options.keywords.default = settings.associative ? yes : no
    const result = await AcApDocManager.instance.editor.getKeywords(options)
    if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      const associative = result.stringResult === 'Yes'
      this.settings.associative = associative
      this.setActiveSysVar(AcDbSystemVariables.HPASSOC, associative ? 1 : 0)
    }
  }

  /**
   * Outcome of a HATCH sub-prompt branch (pick points / select objects).
   *
   * - `continue`: stay in the main HATCH loop (Enter ended the sub-prompt).
   * - `cancel`: ESC cancelled the sub-prompt; discard session hatches and exit.
   */
  protected static readonly BRANCH_CONTINUE = 'continue' as const
  protected static readonly BRANCH_CANCEL = 'cancel' as const

  /**
   * Builds a closed polyline from one hatch boundary loop.
   *
   * Polyline loops copy vertices/bulges directly. Edge loops keep bulge 0 for
   * straight edges, circular-arc bulge for arcs, and tessellate other edges.
   *
   * @param loop Hatch boundary loop.
   * @returns Closed polyline, or `undefined` when the loop is empty.
   */
  protected createPolylineFromLoop(
    loop: AcGeLoop2dType
  ): AcDbPolyline | undefined {
    const polyline = new AcDbPolyline()
    polyline.closed = true

    if (loop instanceof AcGePolyline2d) {
      if (loop.numberOfVertices < 2) return undefined
      loop.vertices.forEach((vertex, index) => {
        polyline.addVertexAt(
          index,
          new AcGePoint2d(vertex.x, vertex.y),
          vertex.bulge ?? 0
        )
      })
      return polyline
    }

    if (!(loop instanceof AcGeLoop2d) || loop.numberOfEdges === 0) {
      return undefined
    }

    let vertexIndex = 0
    for (const curve of loop.curves) {
      if (curve instanceof AcGeLine2d) {
        polyline.addVertexAt(
          vertexIndex++,
          new AcGePoint2d(curve.startPoint.x, curve.startPoint.y),
          0
        )
        continue
      }

      if (curve instanceof AcGeCircArc2d) {
        const bulge = acgeBulgeFromCircArc2d(curve) ?? 0
        polyline.addVertexAt(
          vertexIndex++,
          new AcGePoint2d(curve.startPoint.x, curve.startPoint.y),
          bulge
        )
        continue
      }

      const points = curve.getPoints(16)
      for (let i = 0; i < points.length - 1; i++) {
        const point = points[i]
        polyline.addVertexAt(
          vertexIndex++,
          new AcGePoint2d(point.x, point.y),
          0
        )
      }
    }

    return polyline.numberOfVertices >= 2 ? polyline : undefined
  }

  /**
   * Applies AutoCAD-style Remove Boundaries to the given hatches.
   *
   * - Selecting a path-source boundary (or a geometrically matching boundary
   *   entity for non-associative / pick-point hatches) drops that path from
   *   the hatch. Kept paths retain their geometry and soft-pointers.
   * - Selecting a session hatch by id with no matching boundary path erases
   *   that hatch. When a window pick includes both the hatch and a boundary,
   *   path drops take precedence over full erase.
   *
   * Unlike boundary erase (which keeps last geometry after disassociation),
   * Remove Boundaries must drop the matched loops so islands fill in.
   *
   * @param context Active command context.
   * @param hatches Hatches to edit.
   * @param removeIds Object ids selected by the user.
   * @returns `true` when at least one hatch changed.
   */
  protected applyRemoveBoundaries(
    context: AcApContext,
    hatches: ReadonlyArray<AcDbHatch>,
    removeIds: ReadonlySet<string>
  ): boolean {
    if (!hatches.length || removeIds.size === 0) return false

    let changed = false
    for (const hatch of [...hatches]) {
      const hatchId = String(hatch.objectId)
      const isSessionHatch = this._sessionHatches.includes(hatch)

      const dropIndices = this.collectRemoveBoundaryPathIndices(
        context,
        hatch,
        removeIds
      )

      // Prefer dropping matched paths over erasing the whole session hatch
      // when a window/crossing pick includes both the fill and a boundary.
      if (
        dropIndices.size === 0 &&
        removeIds.has(hatchId) &&
        isSessionHatch
      ) {
        this.eraseHatchEntity(context, hatch)
        changed = true
        continue
      }

      if (dropIndices.size === 0) continue

      const writable = isSessionHatch
        ? hatch
        : context.doc.database.openEntityForWrite(hatch)
      if (!(writable instanceof AcDbHatch)) continue

      const keptLoops: AcGeLoop2dType[] = []
      const keptSources: AcDbObjectId[][] = []
      const loopCount = writable.loops.length
      for (let i = 0; i < loopCount; i++) {
        if (dropIndices.has(i)) continue
        const loop = writable.loops[i]
        keptLoops.push(loop.clone())
        keptSources.push([...writable.pathSourceIds(i)])
      }

      if (keptLoops.length === 0) {
        this.eraseHatchEntity(context, writable)
        changed = true
        continue
      }

      // Whole matched paths are dropped; kept paths already have correct
      // geometry and remaining soft-pointers (no per-path partial rebuild).
      writable.setLoops(keptLoops, keptSources)
      if (!writable.hasAnyPathSourceIds()) {
        writable.associative = false
      }

      if (context.view.hasEntity(writable.objectId)) {
        context.view.updateEntity(writable)
      }
      changed = true
    }

    return changed
  }

  /**
   * Resolves hatch path indices that should be dropped for Remove Boundaries.
   *
   * Prefers soft-pointer matches; falls back to geometric loop matching so
   * pick-point (non-associative) hatches can still drop islands.
   */
  private collectRemoveBoundaryPathIndices(
    context: AcApContext,
    hatch: AcDbHatch,
    removeIds: ReadonlySet<string>
  ): Set<number> {
    const dropIndices = new Set<number>()
    const hatchId = String(hatch.objectId)

    hatch.allPathSourceIds.forEach((sources, index) => {
      if (sources.some(id => removeIds.has(String(id)))) {
        dropIndices.add(index)
      }
    })

    for (const id of removeIds) {
      if (id === hatchId) continue
      const entity = context.doc.database.getObjectById(id)
      if (!(entity instanceof AcDbEntity)) continue
      for (const index of this.findLoopIndicesMatchingBoundary(hatch, entity)) {
        dropIndices.add(index)
      }
    }

    return dropIndices
  }

  /**
   * Finds hatch loop indices whose geometry matches a boundary entity.
   */
  private findLoopIndicesMatchingBoundary(
    hatch: AcDbHatch,
    entity: AcDbEntity
  ): number[] {
    const edges = acdbHatchBoundaryEdgesFromEntity(entity)
    if (edges.length === 0) return []

    const candidates = this.buildLoopsFromEdges(edges)
    if (candidates.length === 0) {
      const fallback = new AcGeLoop2d([...edges])
      if (fallback.closed && fallback.numberOfEdges > 0) {
        candidates.push(fallback)
      }
    }
    if (candidates.length === 0) return []

    const matched: number[] = []
    hatch.loops.forEach((loop, index) => {
      if (candidates.some(candidate => this.loopsRoughlyEqual(loop, candidate))) {
        matched.push(index)
      }
    })
    return matched
  }

  /**
   * Best-effort equality for hatch loops (extents + perimeter length).
   */
  private loopsRoughlyEqual(
    a: AcGeLoop2dType,
    b: AcGeLoop2dType,
    tolerance = 1e-4
  ): boolean {
    const boxA = a.box
    const boxB = b.box
    if (
      Math.abs(boxA.min.x - boxB.min.x) > tolerance ||
      Math.abs(boxA.min.y - boxB.min.y) > tolerance ||
      Math.abs(boxA.max.x - boxB.max.x) > tolerance ||
      Math.abs(boxA.max.y - boxB.max.y) > tolerance
    ) {
      return false
    }
    return Math.abs(a.length - b.length) <= tolerance * 10
  }

  /**
   * Executes Remove Boundaries (AutoCAD HATCH / Hatch Creation ribbon).
   *
   * @param context Active command context.
   * @param hatches Optional hatch targets; defaults to session hatches.
   * @param options.databaseEdit Wrap mutations in a named undo group.
   * @returns Branch outcome for the main command loop.
   */
  protected async doRemoveBoundaries(
    context: AcApContext,
    hatches?: ReadonlyArray<AcDbHatch>,
    options: { databaseEdit?: boolean } = {}
  ): Promise<'continue' | 'cancel'> {
    const targets = hatches ?? this._sessionHatches
    if (!targets.length) {
      this.showMessage(AcApI18n.t('jig.hatch.nothingToRemove'), 'warning')
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    // Start a fresh pick set. The hatch (and PICKSTYLE-expanded boundaries)
    // may already be selected from the contextual tab; keeping that set would
    // make island picks look like no-ops and could erase session hatches.
    context.view.selectionSet.clear()

    const selectionOptions = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.hatch.remove')
    )
    selectionOptions.allowObjectOnLockedLayer = true
    selectionOptions.allowGroupSelection = false
    selectionOptions.allowAssociativeHatchSelection = false
    const result =
      await AcApDocManager.instance.editor.getSelection(selectionOptions)
    if (result.status === AcEdPromptStatus.Cancel) {
      return AcApHatchCmd.BRANCH_CANCEL
    }
    if (result.status !== AcEdPromptStatus.OK || !result.value?.ids.length) {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    const removeIds = new Set(result.value.ids.map(id => String(id)))
    const apply = () => this.applyRemoveBoundaries(context, targets, removeIds)
    const changed = options.databaseEdit
      ? (() => {
          let didChange = false
          acapRunDatabaseEdit(
            context.doc.database,
            'Hatch Remove Boundaries',
            () => {
              didChange = apply()
            }
          )
          return didChange
        })()
      : apply()

    if (!changed) {
      this.showMessage(AcApI18n.t('jig.hatch.nothingToRemove'), 'warning')
    }

    // Restore the hatch selection so the contextual tab stays available.
    const remaining = targets.filter(
      hatch => context.doc.database.getObjectById(hatch.objectId) != null
    )
    context.view.selectionSet.clear()
    if (remaining.length > 0) {
      context.view.selectionSet.add(remaining.map(hatch => hatch.objectId))
    }
    return AcApHatchCmd.BRANCH_CONTINUE
  }

  /**
   * Recreates polyline boundaries around existing hatch loops (AutoCAD Recreate).
   *
   * Prompts for boundary type (polyline; region is not supported yet) and
   * optional associativity with the new boundary objects.
   *
   * @param context Active command context.
   * @param hatches Hatches to recreate boundaries for.
   * @param options.databaseEdit Wrap mutations in a named undo group.
   * @returns Branch outcome for the main command loop.
   */
  protected async doRecreateBoundary(
    context: AcApContext,
    hatches: ReadonlyArray<AcDbHatch>,
    options: { databaseEdit?: boolean } = {}
  ): Promise<'continue' | 'cancel'> {
    if (!hatches.length) {
      this.showMessage(AcApI18n.t('jig.hatch.nothingToRecreate'), 'warning')
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    const typeOptions = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.hatch.recreateType')
    )
    const polylineKeyword = typeOptions.keywords.add(
      AcApI18n.t('jig.hatch.keywords.polyline.display'),
      AcApI18n.t('jig.hatch.keywords.polyline.global'),
      AcApI18n.t('jig.hatch.keywords.polyline.local')
    )
    typeOptions.keywords.add(
      AcApI18n.t('jig.hatch.keywords.region.display'),
      AcApI18n.t('jig.hatch.keywords.region.global'),
      AcApI18n.t('jig.hatch.keywords.region.local')
    )
    typeOptions.keywords.default = polylineKeyword
    typeOptions.allowNone = true

    const typeResult =
      await AcApDocManager.instance.editor.getKeywords(typeOptions)
    if (typeResult.status === AcEdPromptStatus.Cancel) {
      return AcApHatchCmd.BRANCH_CANCEL
    }
    if (
      typeResult.status === AcEdPromptStatus.Keyword &&
      typeResult.stringResult === 'Region'
    ) {
      this.showMessage(AcApI18n.t('jig.hatch.regionUnsupported'), 'warning')
    }

    const associateOptions = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.hatch.recreateAssociate')
    )
    associateOptions.allowNone = true
    const yes = associateOptions.keywords.add(
      AcApI18n.t('jig.hatch.keywords.yes.display'),
      AcApI18n.t('jig.hatch.keywords.yes.global'),
      AcApI18n.t('jig.hatch.keywords.yes.local')
    )
    associateOptions.keywords.add(
      AcApI18n.t('jig.hatch.keywords.no.display'),
      AcApI18n.t('jig.hatch.keywords.no.global'),
      AcApI18n.t('jig.hatch.keywords.no.local')
    )
    associateOptions.keywords.default = yes

    const associateResult =
      await AcApDocManager.instance.editor.getKeywords(associateOptions)
    if (associateResult.status === AcEdPromptStatus.Cancel) {
      return AcApHatchCmd.BRANCH_CANCEL
    }
    // Enter / default / Yes keeps association; only an explicit No opts out.
    const associate =
      associateResult.status === AcEdPromptStatus.None ||
      associateResult.stringResult == null ||
      associateResult.stringResult === 'Yes'

    const recreate = () => {
      const modelSpace = context.doc.database.tables.blockTable.modelSpace
      let created = 0

      for (const hatch of hatches) {
        const loops = hatch.loops
        if (!loops.length) continue

        const sourceIds: AcDbObjectId[][] = []
        const rebuiltLoops: AcGeLoop2dType[] = []

        for (const loop of loops) {
          const polyline = this.createPolylineFromLoop(loop)
          if (!polyline) continue
          modelSpace.appendEntity(polyline)
          if (!context.view.hasEntity(polyline.objectId)) {
            context.view.addEntity(polyline)
          }
          created += 1
          rebuiltLoops.push(loop.clone())
          sourceIds.push([polyline.objectId])
        }

        if (!associate || rebuiltLoops.length === 0) continue

        const writable =
          context.doc.database.openEntityForWrite(hatch) ?? hatch
        if (!(writable instanceof AcDbHatch)) continue
        writable.setLoops(rebuiltLoops, sourceIds)
        writable.associative = true
        if (context.view.hasEntity(writable.objectId)) {
          context.view.updateEntity(writable)
        }
      }

      return created > 0
    }

    const created = options.databaseEdit
      ? (() => {
          let didCreate = false
          acapRunDatabaseEdit(
            context.doc.database,
            'Hatch Recreate Boundary',
            () => {
              didCreate = recreate()
            }
          )
          return didCreate
        })()
      : recreate()

    if (!created) {
      this.showMessage(AcApI18n.t('jig.hatch.nothingToRecreate'), 'warning')
    }
    return AcApHatchCmd.BRANCH_CONTINUE
  }

  /**
   * Executes object-selection branch of HATCH.
   *
   * @param context Active command context.
   * @returns Branch outcome for the main command loop.
   */
  protected async doSelectObjects(
    context: AcApContext
  ): Promise<'continue' | 'cancel'> {
    const options = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.hatch.select')
    )
    options.allowObjectOnLockedLayer = true
    const result = await AcApDocManager.instance.editor.getSelection(options)
    if (result.status === AcEdPromptStatus.Cancel) {
      return AcApHatchCmd.BRANCH_CANCEL
    }
    if (result.status !== AcEdPromptStatus.OK || !result.value) {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    const loops = this.collectLoopsFromIds(context, result.value.ids)
    if (loops.length) {
      this.appendHatches(context, loops)
    }
    return AcApHatchCmd.BRANCH_CONTINUE
  }

  /**
   * Executes pick-points branch of HATCH.
   *
   * The user can place multiple seed points. Each accepted point attempts
   * one hatch creation. Enter ends this branch and returns to the main loop;
   * ESC cancels the whole HATCH session (discards created hatches).
   *
   * @param context Active command context.
   * @returns Branch outcome for the main command loop.
   */
  protected async doPickPoints(
    context: AcApContext
  ): Promise<'continue' | 'cancel'> {
    const database = context.doc.database

    while (true) {
      // Refresh boundaries each prompt so newly drawn closed shapes are found.
      const sourceLoops = this.collectLoopsFromAllBoundaries(context)
      const loopInfos = this.buildLoopInfos(sourceLoops)

      const pointOptions = new AcEdPromptPointOptions(
        AcApI18n.t('jig.hatch.pickPoint')
      )
      pointOptions.allowNone = true
      // Interior seed points must follow the true cursor. CEN/END osnap and
      // ORTHO/polar-from-lastPoint would pull HPQUICKPREVIEW onto a recently
      // drawn entity instead of the region under the crosshair.
      pointOptions.disableOSnap = true
      pointOptions.disableTracking = true
      // HPQUICKPREVIEW hover preview (AutoCAD pick-points default).
      pointOptions.jig = new AcApHatchQuickPreviewJig(context.view, {
        database,
        resolveLoops: (point: AcGePoint3dLike) =>
          this.resolveLoopsForPickPoint(point, sourceLoops, loopInfos),
        createHatch: (loops: ReadonlyArray<AcGeLoop2d>) =>
          this.createHatchEntity(context, loops, { associative: false })
      })
      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointOptions)
      if (pointResult.status === AcEdPromptStatus.Cancel) {
        return AcApHatchCmd.BRANCH_CANCEL
      }
      if (pointResult.status !== AcEdPromptStatus.OK || !pointResult.value) {
        break
      }

      const loops = this.resolveLoopsForPickPoint(
        pointResult.value,
        sourceLoops,
        loopInfos
      )
      if (!loops.length) continue
      this.appendHatch(context, loops)
    }

    return AcApHatchCmd.BRANCH_CONTINUE
  }

  /**
   * Runs the interactive command-line HATCH workflow.
   *
   * Matches AutoCAD `-HATCH`: default prompt is pick internal point (with
   * HPQUICKPREVIEW). Keywords cover select-objects and property editing.
   * Enter keeps session hatches; ESC / Cancel discards them.
   *
   * @param context Active command context.
   * @returns Promise resolved when command ends.
   */
  async execute(context: AcApContext) {
    this.beginSession()
    try {
      const database = context.doc.database

      let running = true
      while (running) {
        const sourceLoops = this.collectLoopsFromAllBoundaries(context)
        const loopInfos = this.buildLoopInfos(sourceLoops)

        const options = new AcEdPromptPointOptions(
          AcApI18n.t('jig.hatch.pickPoint')
        )
        options.allowNone = true
        // See doPickPoints: free interior seeds — no osnap / lastPoint tracking.
        options.disableOSnap = true
        options.disableTracking = true
        options.keywords.add(
          AcApI18n.t('jig.hatch.keywords.select.display'),
          AcApI18n.t('jig.hatch.keywords.select.global'),
          AcApI18n.t('jig.hatch.keywords.select.local')
        )
        options.keywords.add(
          AcApI18n.t('jig.hatch.keywords.remove.display'),
          AcApI18n.t('jig.hatch.keywords.remove.global'),
          AcApI18n.t('jig.hatch.keywords.remove.local')
        )
        options.keywords.add(
          AcApI18n.t('jig.hatch.keywords.undo.display'),
          AcApI18n.t('jig.hatch.keywords.undo.global'),
          AcApI18n.t('jig.hatch.keywords.undo.local')
        )
        options.keywords.add(
          AcApI18n.t('jig.hatch.keywords.cancel.display'),
          AcApI18n.t('jig.hatch.keywords.cancel.global'),
          AcApI18n.t('jig.hatch.keywords.cancel.local')
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
        options.keywords.add(
          AcApI18n.t('jig.hatch.keywords.separate.display'),
          AcApI18n.t('jig.hatch.keywords.separate.global'),
          AcApI18n.t('jig.hatch.keywords.separate.local')
        )
        options.jig = new AcApHatchQuickPreviewJig(context.view, {
          database,
          resolveLoops: (point: AcGePoint3dLike) =>
            this.resolveLoopsForPickPoint(point, sourceLoops, loopInfos),
          createHatch: (loops: ReadonlyArray<AcGeLoop2d>) =>
            this.createHatchEntity(context, loops, { associative: false })
        })

        const result = await AcApDocManager.instance.editor.getPoint(options)
        if (result.status === AcEdPromptStatus.OK && result.value) {
          const loops = this.resolveLoopsForPickPoint(
            result.value,
            sourceLoops,
            loopInfos
          )
          if (loops.length) {
            this.appendHatch(context, loops)
          }
          continue
        }

        if (result.status === AcEdPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'SelectObjects') {
            if (
              (await this.doSelectObjects(context)) ===
              AcApHatchCmd.BRANCH_CANCEL
            ) {
              this.markDiscardSession()
              running = false
            }
          } else if (keyword === 'RemoveBoundaries') {
            if (
              (await this.doRemoveBoundaries(context)) ===
              AcApHatchCmd.BRANCH_CANCEL
            ) {
              this.markDiscardSession()
              running = false
            }
          } else if (keyword === 'Undo') {
            if (!this.undoLastSessionHatch(context)) {
              this.showMessage(
                AcApI18n.t('jig.hatch.nothingToUndo'),
                'warning'
              )
            }
          } else if (keyword === 'Cancel') {
            this.markDiscardSession()
            running = false
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
          } else if (keyword === 'SEparate') {
            await this.promptSeparate()
          }
          continue
        }

        // Enter / None accepts; ESC discards.
        if (result.status === AcEdPromptStatus.Cancel) {
          this.markDiscardSession()
        }
        running = false
      }
    } finally {
      this.finishSession(context)
    }
  }
}
