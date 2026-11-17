import {
  AcCmColor,
  AcCmColorMethod,
  type AcDbDatabase,
  AcDbDimStyleTableRecord,
  type AcDbLeader,
  AcDbLinetypeTableRecord,
  AcDbMText,
  AcDbTextStyleTableRecord
} from '@mlightcad/data-model'

import { createCadMeasure } from '../script/createCadMeasure.js'
import type { CadEditTransaction } from '../script/createCadScriptHost.js'
import type { EntitySnapshot } from '../script/entitySnapshot.js'
import type { Point2dInput } from '../tools/types.js'
import {
  acexRedrawPoint,
  acexRedrawRotationDeg,
  type RedrawPointTransform
} from './calibration.js'
import type { RedrawCompareOptions } from './compareRedraw.js'
import {
  REDRAW_DIMENSION_TYPES,
  type RedrawCheckSpec,
  type RedrawEntitySpec,
  type RedrawEntityType,
  type RedrawIssue,
  type RedrawLayerSpec,
  type RedrawOmitGroup,
  type RedrawProfile,
  type RedrawSpec,
  type RedrawStatus
} from './types.js'
import {
  acexRedrawEntityCalibrationId,
  acexRedrawStatus,
  acexRedrawValidateSpec,
  type RedrawValidationResult
} from './validateRedrawSpec.js'

/** Default layers created on demand, following the original skill. */
export const REDRAW_DEFAULT_LAYERS: readonly Required<RedrawLayerSpec>[] = [
  { name: 'OBJECT', color: 7, linetype: 'Continuous' },
  { name: 'HIDDEN', color: 8, linetype: 'HIDDEN' },
  { name: 'CENTER', color: 1, linetype: 'CENTER' },
  { name: 'DIM', color: 3, linetype: 'Continuous' },
  { name: 'TEXT', color: 2, linetype: 'Continuous' },
  { name: 'TABLE', color: 4, linetype: 'Continuous' },
  { name: 'BORDER', color: 7, linetype: 'Continuous' },
  { name: 'CONSTRUCTION', color: 8, linetype: 'DASHED' },
  { name: 'ASSUMPTION', color: 6, linetype: 'Continuous' }
]

/**
 * Dash patterns (drawing units, ISO / mm flavored) for linetypes the redraw
 * may reference. Created only when missing from the drawing.
 */
const LINETYPE_PATTERNS: Record<
  string,
  { description: string; dashes: number[] }
> = {
  HIDDEN: { description: 'Hidden __ __ __', dashes: [6.35, -3.175] },
  CENTER: {
    description: 'Center ____ _ ____ _',
    dashes: [31.75, -6.35, 6.35, -6.35]
  },
  DASHED: { description: 'Dashed __ __ __', dashes: [12.7, -6.35] },
  PHANTOM: {
    description: 'Phantom _____ _ _ _____',
    dashes: [31.75, -6.35, 6.35, -6.35, 6.35, -6.35]
  },
  DOT: { description: 'Dot . . . .', dashes: [0, -6.35] }
}

/** INSUNITS codes for spec units (`unitless` → 0). */
const INSUNITS_BY_UNIT: Record<string, number> = {
  unitless: 0,
  in: 1,
  ft: 2,
  mm: 4,
  cm: 5,
  m: 6
}

/**
 * Text style used by redraw text, leaders, tables, and dimensions.
 *
 * `simsun` + `hztxt.shx` renders CJK in this viewer (its default fallback
 * chain) and in AutoCAD, so redrawn Chinese / Japanese / Korean notes do not
 * turn into "?" boxes under a Latin-only STANDARD style.
 */
export const REDRAW_TEXT_STYLE = {
  name: 'REDRAW_TEXT',
  font: 'simsun',
  bigFont: 'hztxt.shx'
} as const

/** Options for `cad.redraw.draw`. */
export interface RedrawDrawOptions {
  /** Replaces `spec.profile`. */
  profile?: RedrawProfile
  /** Extra groups to skip (`geometry-only` already omits annotations). */
  omit?: RedrawOmitGroup[]
  /** CAD offset added to every mapped point (place the redraw beside existing work). */
  offset?: Point2dInput
  /** Draw even when validation reports blocked (never when it fails). */
  allowBlocked?: boolean
}

/** One evaluated post-draw check. */
export interface RedrawCheckResult {
  name: string
  expected: number
  actual: number | null
  tolerance: number
  pass: boolean
}

/** Result of `cad.redraw.inspect`. */
export interface RedrawInspectionResult {
  status: RedrawStatus
  checks: RedrawCheckResult[]
  /** Readable dimension values compared with what the drawn dimensions measure. */
  dimensionChecks: RedrawCheckResult[]
  missingIds: string[]
  layers: Record<string, number>
  errors: RedrawIssue[]
  warnings: RedrawIssue[]
}

/** Result of `cad.redraw.draw`. */
export interface RedrawDrawResult extends Omit<
  RedrawValidationResult,
  'status'
> {
  status: RedrawStatus
  drawn: boolean
  /** Number of CAD entities created. */
  entityCount: number
  /** Spec entity id → first created CAD entity id. */
  idMap: Record<string, string>
  /** All created ids when there are at most 200 (else omitted). */
  entityIds?: string[]
  skipped: Record<string, number>
  layersCreated: string[]
  textHeight: number
  dimStyle?: string
  /** CJK-capable text style applied to redraw text and dimensions. */
  textStyle?: string
  /** True when INSUNITS was changed to match `spec.units`. */
  unitsApplied: boolean
  /** Dimension entities drawn as lines + text because creation failed. */
  fallbacks: Record<string, number>
  checks: RedrawCheckResult[]
  dimensionChecks: RedrawCheckResult[]
  assumptions: string[]
}

/** Host services `cad.redraw` needs from the script runtime. */
export interface CadRedrawDeps {
  /** Active database (throws when no document is open). */
  getDatabase(): AcDbDatabase
  /** Runs `fn` as one undoable script edit with a sealed transaction. */
  transaction(label: string, fn: (tx: CadEditTransaction) => void): void
  /** Layer names in the drawing. */
  layerNames(): string[]
  /** Entity snapshot by id. */
  snapshot(id: string): EntitySnapshot | undefined
  /** Tick so long draws share the script budget. */
  tick(): void
  /**
   * Queues a pixel comparison fulfilled after the script returns. Omitted
   * by hosts that cannot compare; `compare` then throws.
   */
  queueCompare?(spec: RedrawSpec, options?: RedrawCompareOptions): number
}

/** `cad.redraw` API exposed to scripts. */
export interface CadRedrawApi {
  validate(
    spec: RedrawSpec,
    options?: { profile?: RedrawProfile }
  ): RedrawValidationResult
  draw(spec: RedrawSpec, options?: RedrawDrawOptions): RedrawDrawResult
  inspect(
    spec: RedrawSpec,
    idMap: Record<string, string>,
    options?: { profile?: RedrawProfile }
  ): RedrawInspectionResult
  /**
   * Queues a pixel comparison of the drawing against the attached reference
   * image (registration through the spec calibration, overlay, difference
   * image, edge metrics). Results arrive in the tool result's
   * `redrawCompare` field after the script returns, with images attached.
   */
  compare(
    spec: RedrawSpec,
    options?: RedrawCompareOptions
  ): { queued: true; index: number }
}

const DEFAULT_LAYER_BY_GROUP = {
  geometry: 'OBJECT',
  text: 'TEXT',
  annotation: 'DIM',
  table: 'TABLE',
  center: 'CENTER'
} as const

function defaultLayerFor(
  entity: RedrawEntitySpec,
  type: RedrawEntityType
): string {
  if (type === 'text' || type === 'mtext') return DEFAULT_LAYER_BY_GROUP.text
  if (type === 'leader' || REDRAW_DIMENSION_TYPES.has(type)) {
    return DEFAULT_LAYER_BY_GROUP.annotation
  }
  if (type === 'table') return DEFAULT_LAYER_BY_GROUP.table
  if (type === 'center_mark') return DEFAULT_LAYER_BY_GROUP.center
  // Inferred geometry stays visibly separate so a reviewer can find guesses.
  if (entity.evidence === 'inferred') return 'ASSUMPTION'
  return DEFAULT_LAYER_BY_GROUP.geometry
}

/** Rounds a positive value to 1, 2, 2.5 or 5 × 10ⁿ. */
function niceRound(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 2.5
  const exponent = Math.floor(Math.log10(value))
  const base = 10 ** exponent
  const mantissa = value / base
  const step = [1, 2, 2.5, 5, 10].find(candidate => mantissa <= candidate) ?? 10
  return step * base
}

function omittedGroups(
  profile: RedrawProfile,
  omit: readonly RedrawOmitGroup[] | undefined
): Set<RedrawOmitGroup> {
  const groups = new Set<RedrawOmitGroup>(omit ?? [])
  if (profile === 'geometry-only') {
    groups.add('text')
    groups.add('dimensions')
    groups.add('leaders')
    groups.add('tableText')
  }
  return groups
}

function isOmitted(
  type: RedrawEntityType,
  layer: string,
  groups: Set<RedrawOmitGroup>
): boolean {
  if ((type === 'text' || type === 'mtext') && groups.has('text')) return true
  if (REDRAW_DIMENSION_TYPES.has(type) && groups.has('dimensions')) return true
  if (type === 'leader' && groups.has('leaders')) return true
  if (type === 'table' && groups.has('tables')) return true
  if (type === 'center_mark' && groups.has('center')) return true
  if (groups.has('borders') && layer.toUpperCase() === 'BORDER') return true
  return false
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Per-entity coordinate mapping (identity for CAD coords). */
interface EntityMapper {
  point(value: unknown): Point2dInput
  length(value: number): number
  angle(value: number): number
}

function buildMapper(
  transform: RedrawPointTransform | undefined,
  offset: Point2dInput,
  anchor: Point2dInput | undefined
): EntityMapper {
  if (!transform) {
    return {
      point(value) {
        const point = acexRedrawPoint(value)!
        return { x: point.x + offset.x, y: point.y + offset.y }
      },
      length: value => value,
      angle: value => value
    }
  }
  const at = anchor ?? { x: 0, y: 0 }
  const o = transform(at)
  const ux = transform({ x: at.x + 1, y: at.y })
  const uy = transform({ x: at.x, y: at.y + 1 })
  const scale = Math.sqrt(
    Math.hypot(ux.x - o.x, ux.y - o.y) * Math.hypot(uy.x - o.x, uy.y - o.y)
  )
  const rotation = acexRedrawRotationDeg(transform, at)
  return {
    point(value) {
      const mapped = transform(acexRedrawPoint(value)!)
      return { x: mapped.x + offset.x, y: mapped.y + offset.y }
    },
    length: value => value * scale,
    angle: value => value + rotation
  }
}

/** First point-like field, used as the local anchor for length scaling. */
function entityAnchor(entity: RedrawEntitySpec): Point2dInput | undefined {
  for (const field of [
    'center',
    'start',
    'position',
    'p1',
    'origin',
    'corner1'
  ]) {
    const point = acexRedrawPoint(entity[field])
    if (point) return point
  }
  if (Array.isArray(entity.points)) return acexRedrawPoint(entity.points[0])
  if (typeof entity.x === 'number' && typeof entity.y === 'number') {
    return { x: entity.x, y: entity.y }
  }
  return undefined
}

/** Ensures a linetype record exists; returns the name to assign. */
function ensureLinetype(
  db: AcDbDatabase,
  name: string | undefined
): string | undefined {
  if (!name) return undefined
  const upper = name.toUpperCase()
  if (upper === 'CONTINUOUS' || upper === 'BYLAYER' || upper === 'BYBLOCK') {
    return name
  }
  const table = db.tables.linetypeTable
  for (const record of table.newIterator()) {
    if (record.name.toUpperCase() === upper) return record.name
  }
  const pattern = LINETYPE_PATTERNS[upper]
  if (!pattern) return undefined
  table.add(
    new AcDbLinetypeTableRecord({
      name: upper,
      description: pattern.description,
      standardFlag: 0,
      totalPatternLength: pattern.dashes.reduce(
        (sum, d) => sum + Math.abs(d),
        0
      ),
      pattern: pattern.dashes.map(elementLength => ({
        elementLength,
        elementTypeFlag: 0
      }))
    })
  )
  return upper
}

/**
 * Creates (or reuses) the CJK-capable {@link REDRAW_TEXT_STYLE}. An existing
 * record of that name is kept as the user left it.
 */
function ensureTextStyle(db: AcDbDatabase): string {
  const { name, font, bigFont } = REDRAW_TEXT_STYLE
  if (!db.tables.textStyleTable.has(name)) {
    db.tables.textStyleTable.add(
      new AcDbTextStyleTableRecord({
        name,
        standardFlag: 0,
        fixedTextHeight: 0,
        widthFactor: 1,
        obliqueAngle: 0,
        textGenerationFlag: 0,
        lastHeight: 2.5,
        font,
        bigFont,
        extendedFont: font
      })
    )
  }
  return name
}

/**
 * Creates (or reuses) a dimension style scaled so dimension text matches
 * `textHeight`, using `textStyle` for its text. Existing user styles are
 * never modified.
 */
function ensureDimStyle(
  db: AcDbDatabase,
  textHeight: number,
  textStyle: string
): string {
  const base = AcDbDimStyleTableRecord.DEFAULT_DIM_VALUES.dimtxt || 2.5
  const scale = textHeight / base
  const name = `REDRAW_${Number(scale.toPrecision(4))}`
  if (!db.tables.dimStyleTable.has(name)) {
    db.tables.dimStyleTable.add(
      new AcDbDimStyleTableRecord({
        name,
        dimscale: scale,
        dimtxsty: textStyle
      })
    )
  }
  return name
}

function resolveTarget(
  value: unknown,
  idMap: Record<string, string>,
  deps: CadRedrawDeps
): Point2dInput | undefined {
  if (typeof value === 'string') {
    const id = idMap[value]
    const geometry = id
      ? (deps.snapshot(id)?.geometry as Record<string, unknown> | undefined)
      : undefined
    return (
      acexRedrawPoint(geometry?.center) ??
      acexRedrawPoint(geometry?.position) ??
      acexRedrawPoint(geometry?.midPoint)
    )
  }
  return acexRedrawPoint(value)
}

function measureCheck(
  check: RedrawCheckSpec,
  idMap: Record<string, string>,
  deps: CadRedrawDeps
): number | undefined {
  if (check.measure === 'distance') {
    const a = resolveTarget(check.from, idMap, deps)
    const b = resolveTarget(check.to, idMap, deps)
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : undefined
  }
  if (check.measure === 'angle') {
    const a = resolveTarget(check.from, idMap, deps)
    const b = resolveTarget(check.to, idMap, deps)
    return a && b
      ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      : undefined
  }
  const id = check.entity ? idMap[check.entity] : undefined
  if (!id) return undefined
  // Reuse cad.measure so length/area/radius follow the same fallbacks
  // (closed polylines that report area 0, lines without a length field).
  const measure = createCadMeasure(deps.snapshot)
  switch (check.measure) {
    case 'length':
      return measure.length(id)
    case 'area':
      return measure.area(id)
    case 'radius':
      return measure.radius(id)
    case 'dimension': {
      const value = (
        deps.snapshot(id)?.geometry as Record<string, unknown> | undefined
      )?.measurement
      return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined
    }
    default:
      return undefined
  }
}

/**
 * Inspects the drawing produced for a spec: created entities still exist,
 * declared checks hold, and readable dimension values agree with what the
 * drawn dimensions measure (a mismatch means geometry and annotation conflict).
 */
function inspectRedraw(
  spec: RedrawSpec,
  idMap: Record<string, string>,
  deps: CadRedrawDeps,
  profile: RedrawProfile
): RedrawInspectionResult {
  const errors: RedrawIssue[] = []
  const warnings: RedrawIssue[] = []
  const missingIds: string[] = []
  const layers: Record<string, number> = {}
  const dimensionChecks: RedrawCheckResult[] = []
  const dimTolerance = spec.validation?.dimensionTolerance
  const annotationTypes = new Set(['Dimension', 'Leader', 'MText', 'Text'])

  for (const entity of Array.isArray(spec.entities) ? spec.entities : []) {
    if (!entity || typeof entity.id !== 'string') continue
    const cadId = idMap[entity.id]
    if (!cadId) continue
    deps.tick()
    const snapshot = deps.snapshot(cadId)
    if (!snapshot) {
      missingIds.push(entity.id)
      continue
    }
    layers[snapshot.layer] = (layers[snapshot.layer] ?? 0) + 1
    if (
      profile === 'geometry-only' &&
      [...annotationTypes].some(type => snapshot.type.includes(type))
    ) {
      errors.push({
        level: 'error',
        kind: 'invalid',
        path: `entities.${entity.id}`,
        message: `geometry-only output contains annotation ${snapshot.type}`
      })
    }
    if (
      typeof entity.type === 'string' &&
      REDRAW_DIMENSION_TYPES.has(entity.type as RedrawEntityType) &&
      typeof entity.value === 'number'
    ) {
      const measured = (
        snapshot.geometry as Record<string, unknown> | undefined
      )?.measurement
      // Angular dimensions measure radians; the spec value is in degrees.
      const toSpecUnits =
        entity.type === 'angular_dimension'
          ? (v: number) => (v * 180) / Math.PI
          : (v: number) => v
      const actual =
        typeof measured === 'number' && Number.isFinite(measured)
          ? toSpecUnits(measured)
          : null
      const expected = entity.value
      const tolerance = num(
        dimTolerance,
        Math.max(Math.abs(expected) * 0.005, 1e-6)
      )
      const pass = actual !== null && Math.abs(actual - expected) <= tolerance
      dimensionChecks.push({
        name: `${entity.id} value`,
        expected,
        actual,
        tolerance,
        pass
      })
      if (!pass) {
        const issue: RedrawIssue = {
          level: entity.evidence === 'known' ? 'error' : 'warning',
          kind: 'conflict',
          path: `entities.${entity.id}`,
          message: `drawn geometry measures ${actual ?? 'n/a'} but the dimension reads ${expected}`
        }
        if (issue.level === 'error') errors.push(issue)
        else warnings.push(issue)
      }
    }
  }
  if (missingIds.length > 0) {
    warnings.push({
      level: 'warning',
      path: 'idMap',
      message: `${missingIds.length} drawn entit(ies) no longer exist: ${missingIds.slice(0, 20).join(', ')}`
    })
  }

  const checks: RedrawCheckResult[] = []
  ;(Array.isArray(spec.checks) ? spec.checks : []).forEach((check, index) => {
    deps.tick()
    const tolerance = num(check?.tolerance, 1e-3)
    const actual = check ? measureCheck(check, idMap, deps) : undefined
    const expected = num(check?.expected, Number.NaN)
    const pass =
      actual !== undefined &&
      Number.isFinite(expected) &&
      (check.measure === 'angle'
        ? Math.abs(((actual - expected + 540) % 360) - 180) <= tolerance
        : Math.abs(actual - expected) <= tolerance)
    checks.push({
      name: check?.name ?? `${check?.measure ?? 'check'}#${index}`,
      expected,
      actual: actual ?? null,
      tolerance,
      pass
    })
  })

  const failed = checks.filter(check => !check.pass).length
  return {
    status: acexRedrawStatus(errors, warnings, failed),
    checks,
    dimensionChecks,
    missingIds,
    layers,
    errors,
    warnings
  }
}

/**
 * Builds the `cad.redraw` namespace: validate a semantic image-redraw spec,
 * draw it in one undo group (layers, linetypes, calibrated coordinates,
 * annotations by profile), and inspect the result.
 */
export function createCadRedraw(deps: CadRedrawDeps): CadRedrawApi {
  return {
    validate(spec, options) {
      return acexRedrawValidateSpec(spec, options?.profile).result
    },

    compare(spec, options) {
      if (!deps.queueCompare) {
        throw new Error(
          'cad.redraw.compare is not available in this session (no renderer / reference images)'
        )
      }
      if (!spec || typeof spec !== 'object') {
        throw new Error('cad.redraw.compare expects the redraw spec')
      }
      return { queued: true, index: deps.queueCompare(spec, options) }
    },

    inspect(spec, idMap, options) {
      const profile =
        options?.profile ?? acexRedrawValidateSpec(spec).result.profile
      return inspectRedraw(spec, idMap ?? {}, deps, profile)
    },

    draw(spec, options = {}) {
      const context = acexRedrawValidateSpec(spec, options.profile)
      const validation = context.result
      const profile = validation.profile
      const empty = {
        drawn: false,
        entityCount: 0,
        idMap: {},
        skipped: {},
        layersCreated: [],
        textHeight: 0,
        unitsApplied: false,
        fallbacks: {},
        checks: [],
        dimensionChecks: [],
        assumptions: Array.isArray(spec?.assumptions) ? spec.assumptions : []
      }
      const blockedOnly = validation.errors.every(
        issue => issue.kind === 'blocked'
      )
      if (
        validation.status === 'fail' ||
        (validation.status === 'blocked' &&
          !(options.allowBlocked && blockedOnly))
      ) {
        return { ...validation, ...empty }
      }

      const offset = acexRedrawPoint(options.offset) ?? { x: 0, y: 0 }
      const groups = omittedGroups(profile, options.omit)
      const skipped: Record<string, number> = {}
      const idMap: Record<string, string> = {}
      const created: string[] = []
      const layersCreated: string[] = []
      const warnings = [...validation.warnings]

      // Pre-map entities so text height can follow the drawing size.
      const prepared = spec.entities.map(entity => {
        const type = entity.type as RedrawEntityType
        const coords = entity.coords ?? spec.coords ?? 'cad'
        const calibrationId =
          coords === 'source'
            ? acexRedrawEntityCalibrationId(spec, entity, context.views)
            : undefined
        const transform = calibrationId
          ? context.calibrations.get(calibrationId)?.transform
          : undefined
        const mapper = buildMapper(transform, offset, entityAnchor(entity))
        const layer =
          typeof entity.layer === 'string' && entity.layer.trim()
            ? entity.layer.trim()
            : defaultLayerFor(entity, type)
        return { entity, type, mapper, layer }
      })

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const { entity, mapper } of prepared) {
        const anchor = entityAnchor(entity)
        if (!anchor) continue
        const p = mapper.point(anchor)
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
        const radius = num(entity.radius, 0)
        if (radius > 0) {
          const r = mapper.length(radius)
          minX = Math.min(minX, p.x - r)
          minY = Math.min(minY, p.y - r)
          maxX = Math.max(maxX, p.x + r)
          maxY = Math.max(maxY, p.y + r)
        }
      }
      const span = Number.isFinite(maxX)
        ? Math.max(maxX - minX, maxY - minY)
        : 0
      const textHeight =
        typeof spec.textHeight === 'number' && spec.textHeight > 0
          ? spec.textHeight
          : span > 0
            ? niceRound(span / 80)
            : 2.5
      const linetypeScale = num(
        spec.linetypeScale,
        Math.max(textHeight / 2.5, 1e-6)
      )

      const layerSpecs = new Map<string, RedrawLayerSpec>()
      for (const layer of REDRAW_DEFAULT_LAYERS)
        layerSpecs.set(layer.name.toUpperCase(), layer)
      for (const layer of Array.isArray(spec.layers) ? spec.layers : []) {
        if (layer?.name) layerSpecs.set(layer.name.toUpperCase(), layer)
      }

      let dimStyle: string | undefined
      let textStyle: string | undefined
      let unitsApplied = false
      const fallbacks: Record<string, number> = {}

      deps.transaction('Image redraw', tx => {
        const db = deps.getDatabase()
        const known = new Map(
          deps.layerNames().map(name => [name.toUpperCase(), name])
        )

        const resolveLayer = (name: string): string => {
          const existing = known.get(name.toUpperCase())
          if (existing) return existing
          tx.createLayer(name)
          known.set(name.toUpperCase(), name)
          layersCreated.push(name)
          const layerSpec = layerSpecs.get(name.toUpperCase())
          const record = db.tables.layerTable.getAt(name)
          if (record && layerSpec) {
            const writable =
              db.openObjectForWrite<typeof record>(record.objectId) ?? record
            if (layerSpec.color !== undefined) {
              writable.color = new AcCmColor(
                AcCmColorMethod.ByACI,
                layerSpec.color
              )
            }
            const linetype = ensureLinetype(db, layerSpec.linetype)
            if (linetype) writable.linetype = linetype
          }
          return name
        }

        // Units follow the spec so the saved drawing reports them (INSUNITS).
        const insunits = INSUNITS_BY_UNIT[validation.units]
        if (insunits !== undefined && db.insunits !== insunits) {
          db.insunits = insunits
          unitsApplied = true
        }

        const needsText = prepared.some(
          ({ type, layer }) =>
            (type === 'text' ||
              type === 'mtext' ||
              type === 'leader' ||
              type === 'table' ||
              REDRAW_DIMENSION_TYPES.has(type)) &&
            !isOmitted(type, layer, groups)
        )
        if (needsText) textStyle = ensureTextStyle(db)

        const needsDimStyle = prepared.some(
          ({ type, layer }) =>
            (REDRAW_DIMENSION_TYPES.has(type) || type === 'leader') &&
            !isOmitted(type, layer, groups)
        )
        if (needsDimStyle) {
          dimStyle = ensureDimStyle(db, textHeight, textStyle ?? '')
        }

        /**
         * Draws a dimension; when the dimension engine rejects the input
         * (degenerate points, style issues) it falls back to plain linework
         * plus a label so one bad annotation does not abort the whole redraw.
         */
        const drawDimension = (
          entity: RedrawEntitySpec,
          type: RedrawEntityType,
          layer: string,
          draw: () => string,
          fallback: () => string[]
        ): string[] => {
          try {
            return [draw()]
          } catch (error) {
            fallbacks[type] = (fallbacks[type] ?? 0) + 1
            warnings.push({
              level: 'warning',
              path: `entities.${entity.id ?? type}`,
              message: `${type} could not be created (${
                error instanceof Error ? error.message : String(error)
              }); drawn as lines and text on ${layer} instead`
            })
            return fallback()
          }
        }

        /** Label for a fallback dimension: explicit text, else the value. */
        const dimLabel = (entity: RedrawEntitySpec, prefix = ''): string =>
          typeof entity.text === 'string' && entity.text
            ? entity.text
            : typeof entity.value === 'number'
              ? `${prefix}${entity.value}`
              : '?'

        const lineWithLabel = (
          a: Point2dInput,
          b: Point2dInput,
          label: string,
          layer: string
        ): string[] => [
          tx.drawLine({ start: a, end: b, layer }),
          tx.drawText({
            position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + textHeight },
            text: label,
            height: textHeight,
            rotationDeg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
            layer
          })
        ]

        for (const {
          entity,
          type,
          mapper,
          layer: requestedLayer
        } of prepared) {
          deps.tick()
          if (isOmitted(type, requestedLayer, groups)) {
            skipped[type] = (skipped[type] ?? 0) + 1
            continue
          }
          const layer = resolveLayer(requestedLayer)
          const ids: string[] = []
          const P = (field: string) => mapper.point(entity[field])
          const height =
            mapper.length(num(entity.height, Number.NaN)) || textHeight
          const text = typeof entity.text === 'string' ? entity.text : undefined

          switch (type) {
            case 'line':
              ids.push(tx.drawLine({ start: P('start'), end: P('end'), layer }))
              break
            case 'polyline':
              ids.push(
                tx.drawPolyline({
                  points: (entity.points as unknown[]).map(p =>
                    mapper.point(p)
                  ),
                  closed: entity.closed === true,
                  layer
                })
              )
              break
            case 'rectangle': {
              let a: Point2dInput
              let c: Point2dInput
              if (entity.corner1 !== undefined) {
                a = acexRedrawPoint(entity.corner1)!
                c = acexRedrawPoint(entity.corner2)!
              } else {
                const x = entity.x as number
                const y = entity.y as number
                a = { x, y }
                c = {
                  x: x + (entity.width as number),
                  y: y + (entity.height as number)
                }
              }
              // Map all four corners so rotated calibrations stay rectangular.
              ids.push(
                tx.drawPolyline({
                  points: [a, { x: c.x, y: a.y }, c, { x: a.x, y: c.y }].map(
                    p => mapper.point(p)
                  ),
                  closed: true,
                  layer
                })
              )
              break
            }
            case 'circle':
              ids.push(
                tx.drawCircle({
                  center: P('center'),
                  radius: mapper.length(entity.radius as number),
                  layer
                })
              )
              break
            case 'arc':
              ids.push(
                tx.drawArc({
                  center: P('center'),
                  radius: mapper.length(entity.radius as number),
                  startAngleDeg: mapper.angle(entity.startAngle as number),
                  endAngleDeg: mapper.angle(entity.endAngle as number),
                  layer
                })
              )
              break
            case 'ellipse':
              ids.push(
                tx.drawEllipse({
                  center: P('center'),
                  majorRadius: mapper.length(entity.majorRadius as number),
                  minorRadius: mapper.length(entity.minorRadius as number),
                  rotationDeg: mapper.angle(num(entity.rotation, 0)),
                  layer
                })
              )
              break
            case 'center_mark': {
              const center = P('center')
              const half = mapper.length(num(entity.size, 0)) / 2 || textHeight
              ids.push(
                tx.drawLine({
                  start: { x: center.x - half, y: center.y },
                  end: { x: center.x + half, y: center.y },
                  layer
                }),
                tx.drawLine({
                  start: { x: center.x, y: center.y - half },
                  end: { x: center.x, y: center.y + half },
                  layer
                })
              )
              break
            }
            case 'text':
            case 'mtext':
              ids.push(
                tx.drawText({
                  position: P('position'),
                  text: text ?? '',
                  height,
                  rotationDeg: mapper.angle(num(entity.rotation, 0)),
                  ...(typeof entity.width === 'number'
                    ? { width: mapper.length(entity.width) }
                    : {}),
                  layer
                })
              )
              break
            case 'leader': {
              const textLayer =
                typeof entity.textLayer === 'string'
                  ? resolveLayer(entity.textLayer)
                  : undefined
              const leaderId = tx.drawLeader({
                points: (entity.points as unknown[]).map(p => mapper.point(p)),
                ...(text ? { text } : {}),
                ...(entity.textPosition !== undefined
                  ? { textPosition: P('textPosition') }
                  : {}),
                textHeight:
                  mapper.length(num(entity.textHeight, Number.NaN)) ||
                  textHeight,
                ...(textLayer ? { textLayer } : {}),
                styleName: dimStyle,
                layer
              })
              ids.push(leaderId)
              // The annotation MTEXT is a separate entity; count it too.
              const annotation = (
                db.openObjectForRead(leaderId) as AcDbLeader | undefined
              )?.associatedAnnotation
              if (annotation) ids.push(annotation)
              break
            }
            case 'linear_dimension':
            case 'aligned_dimension': {
              const p1 = P('p1')
              const p2 = P('p2')
              const dimLine = P('dimLine')
              ids.push(
                ...drawDimension(
                  entity,
                  type,
                  layer,
                  () =>
                    type === 'linear_dimension'
                      ? tx.drawDimLinear({
                          xLine1Point: p1,
                          xLine2Point: p2,
                          dimLinePoint: dimLine,
                          ...(typeof entity.rotation === 'number'
                            ? { rotationDeg: mapper.angle(entity.rotation) }
                            : {}),
                          ...(text ? { text } : {}),
                          styleName: dimStyle,
                          layer
                        })
                      : tx.drawDimAligned({
                          xLine1Point: p1,
                          xLine2Point: p2,
                          dimLinePoint: dimLine,
                          ...(text ? { text } : {}),
                          styleName: dimStyle,
                          layer
                        }),
                  () => lineWithLabel(p1, p2, dimLabel(entity), layer)
                )
              )
              break
            }
            case 'radial_dimension':
            case 'diameter_dimension': {
              const center = P('center')
              const radius = mapper.length(entity.radius as number)
              const angleDeg = mapper.angle(num(entity.angle, 45))
              const input = {
                center,
                radius,
                angleDeg,
                ...(typeof entity.leaderLength === 'number'
                  ? { leaderLength: mapper.length(entity.leaderLength) }
                  : {}),
                ...(text ? { text } : {}),
                styleName: dimStyle,
                layer
              }
              ids.push(
                ...drawDimension(
                  entity,
                  type,
                  layer,
                  () =>
                    type === 'radial_dimension'
                      ? tx.drawDimRadius(input)
                      : tx.drawDimDiameter(input),
                  () => {
                    // Like the original skill: a failed radius becomes a leader.
                    const rad = (angleDeg * Math.PI) / 180
                    const tip = {
                      x: center.x + Math.cos(rad) * radius,
                      y: center.y + Math.sin(rad) * radius
                    }
                    const out = radius * 0.5 + textHeight * 2
                    const elbow = {
                      x: tip.x + Math.cos(rad) * out,
                      y: tip.y + Math.sin(rad) * out
                    }
                    const landing = {
                      x: elbow.x + (Math.cos(rad) >= 0 ? 1 : -1) * textHeight * 2,
                      y: elbow.y
                    }
                    const leaderId = tx.drawLeader({
                      points: [tip, elbow, landing],
                      text: dimLabel(
                        entity,
                        type === 'radial_dimension' ? 'R' : '%%c'
                      ),
                      textHeight,
                      layer
                    })
                    const annotation = (
                      db.openObjectForRead(leaderId) as AcDbLeader | undefined
                    )?.associatedAnnotation
                    return annotation ? [leaderId, annotation] : [leaderId]
                  }
                )
              )
              break
            }
            case 'angular_dimension': {
              const center = P('center')
              const p1 = P('p1')
              const p2 = P('p2')
              const arcPoint = P('arcPoint')
              ids.push(
                ...drawDimension(
                  entity,
                  type,
                  layer,
                  () =>
                    tx.drawDimAngular({
                      center,
                      xLine1Point: p1,
                      xLine2Point: p2,
                      arcPoint,
                      ...(text ? { text } : {}),
                      styleName: dimStyle,
                      layer
                    }),
                  () => [
                    tx.drawLine({ start: center, end: p1, layer }),
                    tx.drawLine({ start: center, end: p2, layer }),
                    tx.drawText({
                      position: arcPoint,
                      text: dimLabel(entity).replace(/^(\d+(\.\d+)?)$/, '$1°'),
                      height: textHeight,
                      layer
                    })
                  ]
                )
              )
              break
            }
            case 'table': {
              const origin = P('origin')
              const widths = (entity.columnWidths as number[]).map(w =>
                mapper.length(w)
              )
              const heights = (entity.rowHeights as number[]).map(h =>
                mapper.length(h)
              )
              const totalW = widths.reduce((sum, w) => sum + w, 0)
              const totalH = heights.reduce((sum, h) => sum + h, 0)
              // Tables are plain linework (origin = top-left, rows grow downward).
              ids.push(
                tx.drawRectangle({
                  corner1: origin,
                  corner2: { x: origin.x + totalW, y: origin.y - totalH },
                  layer
                })
              )
              let x = origin.x
              for (const w of widths.slice(0, -1)) {
                x += w
                ids.push(
                  tx.drawLine({
                    start: { x, y: origin.y },
                    end: { x, y: origin.y - totalH },
                    layer
                  })
                )
              }
              let y = origin.y
              for (const h of heights.slice(0, -1)) {
                y -= h
                ids.push(
                  tx.drawLine({
                    start: { x: origin.x, y },
                    end: { x: origin.x + totalW, y },
                    layer
                  })
                )
              }
              const cells = Array.isArray(entity.cells)
                ? (entity.cells as unknown[][])
                : []
              if (!groups.has('tableText') && cells.length > 0) {
                const cellText =
                  mapper.length(num(entity.textHeight, Number.NaN)) ||
                  textHeight
                const textLayer =
                  typeof entity.textLayer === 'string'
                    ? resolveLayer(entity.textLayer)
                    : layer
                let rowTop = origin.y
                cells.forEach((row, r) => {
                  const rowHeight = heights[r]
                  if (rowHeight === undefined || !Array.isArray(row)) return
                  let left = origin.x
                  row.forEach((cell, c) => {
                    const width = widths[c]
                    if (width === undefined) return
                    if (typeof cell === 'string' && cell.trim()) {
                      deps.tick()
                      ids.push(
                        tx.drawText({
                          position: {
                            x: left + Math.min(cellText * 0.5, width * 0.1),
                            y: rowTop - rowHeight / 2 + cellText / 2
                          },
                          text: cell,
                          height: Math.min(cellText, rowHeight * 0.7),
                          layer: textLayer
                        })
                      )
                    }
                    left += width
                  })
                  rowTop -= rowHeight
                })
              }
              break
            }
          }

          // Per-entity color / linetype overrides beyond the layer defaults.
          const linetype =
            typeof entity.linetype === 'string'
              ? ensureLinetype(db, entity.linetype)
              : undefined
          if (typeof entity.linetype === 'string' && !linetype) {
            warnings.push({
              level: 'warning',
              path: `entities.${entity.id ?? type}.linetype`,
              message: `unknown linetype '${entity.linetype}'; kept ByLayer`
            })
          }
          const layerLinetype = layerSpecs.get(layer.toUpperCase())?.linetype
          const dashed =
            !!linetype && linetype.toUpperCase() !== 'CONTINUOUS'
              ? true
              : !!layerLinetype && layerLinetype.toUpperCase() !== 'CONTINUOUS'
          for (const id of ids) {
            const isText =
              textStyle !== undefined &&
              db.openObjectForRead(id) instanceof AcDbMText
            if (
              typeof entity.color !== 'number' &&
              !linetype &&
              !dashed &&
              !isText
            ) {
              continue
            }
            const target = db.openEntityForWrite(id)
            if (!target) continue
            if (isText) (target as AcDbMText).styleName = textStyle!
            if (typeof entity.color === 'number') {
              target.color = new AcCmColor(AcCmColorMethod.ByACI, entity.color)
            }
            if (linetype) target.lineType = linetype
            if (dashed) target.linetypeScale = linetypeScale
          }

          if (ids.length > 0) {
            created.push(...ids)
            if (typeof entity.id === 'string') idMap[entity.id] = ids[0]
          }
        }
      })

      const inspection = inspectRedraw(spec, idMap, deps, profile)
      const errors = [...validation.errors, ...inspection.errors]
      const allWarnings = [...warnings, ...inspection.warnings]
      const failedChecks = inspection.checks.filter(check => !check.pass).length
      return {
        ...validation,
        status: acexRedrawStatus(errors, allWarnings, failedChecks),
        errors,
        warnings: allWarnings,
        drawn: true,
        entityCount: created.length,
        idMap,
        ...(created.length <= 200 ? { entityIds: created } : {}),
        skipped,
        layersCreated,
        textHeight,
        ...(dimStyle ? { dimStyle } : {}),
        ...(textStyle ? { textStyle } : {}),
        unitsApplied,
        fallbacks,
        checks: inspection.checks,
        dimensionChecks: inspection.dimensionChecks,
        assumptions: Array.isArray(spec.assumptions) ? spec.assumptions : []
      }
    }
  }
}
