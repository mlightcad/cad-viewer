import {
  acexRedrawPoint,
  acexRedrawResolveCalibration,
  type RedrawResolvedCalibration
} from './calibration.js'
import {
  REDRAW_ANNOTATION_TYPES,
  REDRAW_ENTITY_TYPES,
  type RedrawCalibrationSpec,
  type RedrawEntitySpec,
  type RedrawEntityType,
  type RedrawEvidenceLevel,
  type RedrawIssue,
  type RedrawProfile,
  type RedrawSpec,
  type RedrawStatus,
  type RedrawUnits,
  type RedrawViewSpec
} from './types.js'

/** Profiles accepted by {@link acexRedrawValidateSpec}. */
export const REDRAW_PROFILES: readonly RedrawProfile[] = [
  'strict-dimensioned',
  'general',
  'hybrid',
  'visual-trace',
  'geometry-only'
]

/** Units accepted by a redraw spec. */
export const REDRAW_UNITS: readonly RedrawUnits[] = [
  'unitless',
  'mm',
  'cm',
  'm',
  'in',
  'ft'
]

const EVIDENCE_LEVELS: readonly RedrawEvidenceLevel[] = [
  'known',
  'scaled',
  'inferred',
  'unreadable'
]

const CALIBRATION_METHODS = [
  'dimension-anchor',
  'similarity',
  'affine',
  'homography',
  'sheet-scale',
  'visual-only'
]

/** Maximum entities one spec may hold (keeps one script inside its budget). */
export const MAX_REDRAW_ENTITIES = 2000

/** Evidence tallies over entities and calibrations. */
export type RedrawEvidenceSummary = Record<RedrawEvidenceLevel, number> & {
  unspecified: number
}

/** Result of {@link acexRedrawValidateSpec}. */
export interface RedrawValidationResult {
  status: RedrawStatus
  profile: RedrawProfile
  units: RedrawUnits
  errors: RedrawIssue[]
  warnings: RedrawIssue[]
  /** Entity count per spec type. */
  entityCounts: Record<string, number>
  evidence: RedrawEvidenceSummary
  calibrations: Array<{
    id: string
    model: RedrawResolvedCalibration['model']
    unitsPerPixel: number
    residual?: number
    evidence?: RedrawEvidenceLevel
  }>
}

/** Validation context reused by the draw step. */
export interface RedrawValidationContext {
  result: RedrawValidationResult
  /** Resolved calibration by id. */
  calibrations: Map<string, RedrawResolvedCalibration>
  /** View by id. */
  views: Map<string, RedrawViewSpec>
}

/**
 * Derives the final status from issues, the way the original skill does:
 * invalid input fails, missing strict evidence blocks, dimension or constraint
 * conflicts need review, and anything else that warned passes with warnings.
 */
export function acexRedrawStatus(
  errors: readonly RedrawIssue[],
  warnings: readonly RedrawIssue[],
  failedChecks = 0
): RedrawStatus {
  if (
    errors.some(issue => issue.kind !== 'blocked' && issue.kind !== 'conflict')
  ) {
    return 'fail'
  }
  if (failedChecks > 0) return 'fail'
  if (errors.some(issue => issue.kind === 'blocked')) return 'blocked'
  if (errors.some(issue => issue.kind === 'conflict')) return 'needs_review'
  return warnings.length > 0 ? 'pass_with_warnings' : 'pass'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

class IssueCollector {
  readonly errors: RedrawIssue[] = []
  readonly warnings: RedrawIssue[] = []

  error(path: string, message: string, kind: RedrawIssue['kind'] = 'invalid') {
    this.errors.push({ level: 'error', kind, path, message })
  }

  warn(path: string, message: string) {
    this.warnings.push({ level: 'warning', path, message })
  }

  point(
    entity: RedrawEntitySpec,
    field: string,
    path: string,
    optional = false
  ) {
    const value = entity[field]
    if (value === undefined && optional) return
    if (!acexRedrawPoint(value)) {
      this.error(`${path}.${field}`, 'expected a point [x, y] or { x, y }')
    }
  }

  points(entity: RedrawEntitySpec, field: string, path: string, min: number) {
    const value = entity[field]
    if (!Array.isArray(value) || value.length < min) {
      this.error(`${path}.${field}`, `expected at least ${min} points`)
      return
    }
    value.forEach((item, index) => {
      if (!acexRedrawPoint(item)) {
        this.error(`${path}.${field}[${index}]`, 'expected a point [x, y]')
      }
    })
  }

  number(
    entity: RedrawEntitySpec,
    field: string,
    path: string,
    options: { optional?: boolean; positive?: boolean } = {}
  ) {
    const value = entity[field]
    if (value === undefined && options.optional) return
    if (!isFiniteNumber(value)) {
      this.error(`${path}.${field}`, 'expected a finite number')
    } else if (options.positive && value <= 0) {
      this.error(`${path}.${field}`, 'must be > 0')
    }
  }

  lengths(entity: RedrawEntitySpec, field: string, path: string) {
    const value = entity[field]
    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      !value.every(item => isFiniteNumber(item) && item > 0)
    ) {
      this.error(
        `${path}.${field}`,
        'expected a non-empty array of numbers > 0'
      )
    }
  }

  text(
    entity: RedrawEntitySpec,
    field: string,
    path: string,
    optional = false
  ) {
    const value = entity[field]
    if (value === undefined && optional) return
    if (typeof value !== 'string' || value.length === 0) {
      this.error(`${path}.${field}`, 'expected a non-empty string')
    }
  }
}

function validateEntityGeometry(
  entity: RedrawEntitySpec,
  type: RedrawEntityType,
  path: string,
  issues: IssueCollector
): void {
  switch (type) {
    case 'line':
      issues.point(entity, 'start', path)
      issues.point(entity, 'end', path)
      break
    case 'polyline':
      issues.points(entity, 'points', path, 2)
      break
    case 'rectangle':
      if (entity.corner1 !== undefined || entity.corner2 !== undefined) {
        issues.point(entity, 'corner1', path)
        issues.point(entity, 'corner2', path)
      } else {
        issues.number(entity, 'x', path)
        issues.number(entity, 'y', path)
        issues.number(entity, 'width', path, { positive: true })
        issues.number(entity, 'height', path, { positive: true })
      }
      break
    case 'circle':
      issues.point(entity, 'center', path)
      issues.number(entity, 'radius', path, { positive: true })
      break
    case 'arc':
      issues.point(entity, 'center', path)
      issues.number(entity, 'radius', path, { positive: true })
      issues.number(entity, 'startAngle', path)
      issues.number(entity, 'endAngle', path)
      break
    case 'ellipse':
      issues.point(entity, 'center', path)
      issues.number(entity, 'majorRadius', path, { positive: true })
      issues.number(entity, 'minorRadius', path, { positive: true })
      issues.number(entity, 'rotation', path, { optional: true })
      break
    case 'center_mark':
      issues.point(entity, 'center', path)
      issues.number(entity, 'size', path, { optional: true, positive: true })
      break
    case 'text':
    case 'mtext':
      issues.point(entity, 'position', path)
      issues.text(entity, 'text', path)
      issues.number(entity, 'height', path, { optional: true, positive: true })
      issues.number(entity, 'rotation', path, { optional: true })
      issues.number(entity, 'width', path, { optional: true, positive: true })
      break
    case 'leader':
      issues.points(entity, 'points', path, 2)
      issues.text(entity, 'text', path, true)
      issues.point(entity, 'textPosition', path, true)
      issues.number(entity, 'textHeight', path, {
        optional: true,
        positive: true
      })
      break
    case 'linear_dimension':
    case 'aligned_dimension':
      issues.point(entity, 'p1', path)
      issues.point(entity, 'p2', path)
      issues.point(entity, 'dimLine', path)
      issues.number(entity, 'rotation', path, { optional: true })
      break
    case 'radial_dimension':
    case 'diameter_dimension':
      issues.point(entity, 'center', path)
      issues.number(entity, 'radius', path, { positive: true })
      issues.number(entity, 'angle', path, { optional: true })
      issues.number(entity, 'leaderLength', path, {
        optional: true,
        positive: true
      })
      break
    case 'angular_dimension':
      issues.point(entity, 'center', path)
      issues.point(entity, 'p1', path)
      issues.point(entity, 'p2', path)
      issues.point(entity, 'arcPoint', path)
      break
    case 'table': {
      issues.point(entity, 'origin', path)
      issues.lengths(entity, 'columnWidths', path)
      issues.lengths(entity, 'rowHeights', path)
      issues.number(entity, 'textHeight', path, {
        optional: true,
        positive: true
      })
      const cells = entity.cells
      if (cells !== undefined) {
        if (
          !Array.isArray(cells) ||
          !cells.every(
            row =>
              Array.isArray(row) &&
              row.every(cell => cell == null || typeof cell === 'string')
          )
        ) {
          issues.error(`${path}.cells`, 'expected string[][] (null for empty)')
        }
      }
      break
    }
  }
  if (REDRAW_ANNOTATION_TYPES.has(type) && type.endsWith('_dimension')) {
    issues.text(entity, 'text', path, true)
    issues.number(entity, 'value', path, { optional: true })
  }
}

function checkConstraint(
  constraint: NonNullable<RedrawSpec['constraints']>[number],
  path: string,
  defaultTolerance: number,
  issues: IssueCollector
): void {
  const type = constraint?.type
  const terms = constraint?.terms
  const numeric = type === 'sum' || type === 'difference' || type === 'equality'
  if (!numeric) {
    issues.warn(
      path,
      `constraint type '${String(type)}' is descriptive and was not numerically checked`
    )
    return
  }
  if (
    !Array.isArray(terms) ||
    terms.length === 0 ||
    !terms.every(isFiniteNumber) ||
    !isFiniteNumber(constraint.expected)
  ) {
    issues.error(
      path,
      'numeric constraints need terms: number[] and expected: number'
    )
    return
  }
  const tolerance = isFiniteNumber(constraint.tolerance)
    ? constraint.tolerance
    : defaultTolerance
  const expected = constraint.expected
  let ok: boolean
  let actual: number
  if (type === 'sum') {
    actual = terms.reduce((sum, term) => sum + term, 0)
    ok = Math.abs(actual - expected) <= tolerance
  } else if (type === 'difference') {
    actual = terms.slice(1).reduce((rest, term) => rest - term, terms[0])
    ok = Math.abs(actual - expected) <= tolerance
  } else {
    const outlier = terms.find(term => Math.abs(term - expected) > tolerance)
    actual = outlier ?? expected
    ok = outlier === undefined
  }
  if (!ok) {
    issues.error(
      path,
      `${type} constraint conflict: got ${actual}, expected ${expected} (±${tolerance}). Record which dimension is wrong instead of silently picking one.`,
      'conflict'
    )
  }
}

/**
 * Validates an image-redraw spec without touching the drawing.
 *
 * Checks the profile, units, views, calibration evidence (and fits each
 * pixel → CAD transform), numeric constraints, unique ids, and the required
 * fields of every entity. Strict-dimensioned specs are blocked when units or
 * known/scaled calibration evidence are missing.
 *
 * @param spec - Spec object built by the script.
 * @param profileOverride - Profile that replaces `spec.profile`.
 */
export function acexRedrawValidateSpec(
  spec: RedrawSpec,
  profileOverride?: RedrawProfile
): RedrawValidationContext {
  const issues = new IssueCollector()
  const calibrations = new Map<string, RedrawResolvedCalibration>()
  const views = new Map<string, RedrawViewSpec>()
  const evidence: RedrawEvidenceSummary = {
    known: 0,
    scaled: 0,
    inferred: 0,
    unreadable: 0,
    unspecified: 0
  }
  const entityCounts: Record<string, number> = {}
  const calibrationSummary: RedrawValidationResult['calibrations'] = []

  const isObject = !!spec && typeof spec === 'object' && !Array.isArray(spec)
  const rawProfile = profileOverride ?? (isObject ? spec.profile : undefined)
  const profile: RedrawProfile = REDRAW_PROFILES.includes(
    rawProfile as RedrawProfile
  )
    ? (rawProfile as RedrawProfile)
    : 'general'
  const rawUnits = isObject ? spec.units : undefined
  const units: RedrawUnits = REDRAW_UNITS.includes(rawUnits as RedrawUnits)
    ? (rawUnits as RedrawUnits)
    : 'unitless'

  const finish = (): RedrawValidationContext => ({
    result: {
      status: acexRedrawStatus(issues.errors, issues.warnings),
      profile,
      units,
      errors: issues.errors,
      warnings: issues.warnings,
      entityCounts,
      evidence,
      calibrations: calibrationSummary
    },
    calibrations,
    views
  })

  if (!isObject) {
    issues.error('spec', 'spec must be an object')
    return finish()
  }
  if (rawProfile !== undefined && profile !== rawProfile) {
    issues.error(
      'profile',
      `unknown profile; use one of ${REDRAW_PROFILES.join(', ')}`
    )
  }
  if (rawUnits !== undefined && units !== rawUnits) {
    issues.error(
      'units',
      `unknown units; use one of ${REDRAW_UNITS.join(', ')}`
    )
  }
  if (
    spec.coords !== undefined &&
    spec.coords !== 'cad' &&
    spec.coords !== 'source'
  ) {
    issues.error('coords', 'coords must be \'cad\' or \'source\'')
  }

  const countEvidence = (level: unknown, path: string) => {
    if (level === undefined) {
      evidence.unspecified++
      return
    }
    if (!EVIDENCE_LEVELS.includes(level as RedrawEvidenceLevel)) {
      issues.error(
        path,
        `evidence must be one of ${EVIDENCE_LEVELS.join(', ')}`
      )
      return
    }
    evidence[level as RedrawEvidenceLevel]++
  }

  // Views
  if (spec.views !== undefined && !Array.isArray(spec.views)) {
    issues.error('views', 'views must be an array')
  }
  for (const [index, view] of (Array.isArray(spec.views)
    ? spec.views
    : []
  ).entries()) {
    const path = `views[${index}]`
    if (!view || typeof view.id !== 'string' || !view.id) {
      issues.error(path, 'view needs a string id')
      continue
    }
    if (views.has(view.id)) issues.error(path, `duplicate view id '${view.id}'`)
    views.set(view.id, view)
    const roi = view.sourceRoi
    if (roi !== undefined) {
      if (
        !Array.isArray(roi) ||
        roi.length !== 4 ||
        !roi.every(isFiniteNumber) ||
        roi[2] <= roi[0] ||
        roi[3] <= roi[1]
      ) {
        issues.error(
          `${path}.sourceRoi`,
          'expected [left, top, right, bottom] with right > left and bottom > top'
        )
      }
    }
    if (view.cadOrigin !== undefined && !acexRedrawPoint(view.cadOrigin)) {
      issues.error(`${path}.cadOrigin`, 'expected a point [x, y]')
    }
  }

  // Calibrations
  const calibrationSpecs = new Map<string, RedrawCalibrationSpec>()
  if (spec.calibration !== undefined && !Array.isArray(spec.calibration)) {
    issues.error('calibration', 'calibration must be an array')
  }
  const calibrationList = Array.isArray(spec.calibration)
    ? spec.calibration
    : []
  calibrationList.forEach((calibration, index) => {
    const path = `calibration[${index}]`
    if (!calibration || typeof calibration.id !== 'string' || !calibration.id) {
      issues.error(path, 'calibration needs a string id')
      return
    }
    if (calibrationSpecs.has(calibration.id)) {
      issues.error(path, `duplicate calibration id '${calibration.id}'`)
    }
    calibrationSpecs.set(calibration.id, calibration)
    if (!CALIBRATION_METHODS.includes(calibration.method)) {
      issues.error(
        `${path}.method`,
        `method must be one of ${CALIBRATION_METHODS.join(', ')}`
      )
    }
    countEvidence(calibration.evidence, `${path}.evidence`)
  })
  for (const view of views.values()) {
    if (
      view.calibration !== undefined &&
      !calibrationSpecs.has(view.calibration)
    ) {
      issues.error(
        `views.${view.id}.calibration`,
        `unknown calibration '${view.calibration}'`
      )
    }
  }
  for (const [id, calibration] of calibrationSpecs) {
    const view = [...views.values()].find(entry => entry.calibration === id)
    try {
      const resolved = acexRedrawResolveCalibration(calibration, view)
      calibrations.set(id, resolved)
      calibrationSummary.push({
        id,
        model: resolved.model,
        unitsPerPixel: resolved.unitsPerPixel,
        ...(resolved.residual !== undefined
          ? { residual: resolved.residual }
          : {}),
        ...(calibration.evidence ? { evidence: calibration.evidence } : {})
      })
      if (
        resolved.residual !== undefined &&
        resolved.residual > resolved.unitsPerPixel * 3
      ) {
        issues.warn(
          `calibration.${id}`,
          `calibration residual ${resolved.residual.toFixed(3)} exceeds ~3 px; check the anchor pairs or use a homography`
        )
      }
    } catch (error) {
      issues.error(
        `calibration.${id}`,
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  // Constraints
  const validation = spec.validation ?? {}
  const constraintTolerance = isFiniteNumber(validation.constraintTolerance)
    ? validation.constraintTolerance
    : 1e-6
  ;(Array.isArray(spec.constraints) ? spec.constraints : []).forEach(
    (constraint, index) =>
      checkConstraint(
        constraint,
        constraint?.id
          ? `constraints.${constraint.id}`
          : `constraints[${index}]`,
        constraintTolerance,
        issues
      )
  )

  // Layers
  ;(Array.isArray(spec.layers) ? spec.layers : []).forEach((layer, index) => {
    const path = `layers[${index}]`
    if (!layer || typeof layer.name !== 'string' || !layer.name.trim()) {
      issues.error(path, 'layer needs a name')
      return
    }
    if (
      layer.color !== undefined &&
      !(Number.isInteger(layer.color) && layer.color >= 1 && layer.color <= 255)
    ) {
      issues.error(`${path}.color`, 'color must be an ACI integer 1–255')
    }
  })

  // Entities
  if (!Array.isArray(spec.entities) || spec.entities.length === 0) {
    issues.error('entities', 'entities must be a non-empty array')
    return finish()
  }
  if (spec.entities.length > MAX_REDRAW_ENTITIES) {
    issues.error(
      'entities',
      `too many entities (${spec.entities.length} > ${MAX_REDRAW_ENTITIES}); split the drawing across several cad.redraw.draw calls`
    )
    return finish()
  }
  const forbidden = new Set(validation.forbiddenEntityTypes ?? [])
  const ids = new Set<string>()
  let annotationCount = 0
  let sourceCoordCount = 0
  spec.entities.forEach((entity, index) => {
    const path =
      entity && typeof entity.id === 'string' && entity.id
        ? `entities.${entity.id}`
        : `entities[${index}]`
    if (!entity || typeof entity !== 'object') {
      issues.error(path, 'entity must be an object')
      return
    }
    const type = entity.type as RedrawEntityType
    if (!REDRAW_ENTITY_TYPES.includes(type)) {
      issues.error(
        `${path}.type`,
        `unsupported type '${String(entity.type)}'; use one of ${REDRAW_ENTITY_TYPES.join(', ')}`
      )
      return
    }
    entityCounts[type] = (entityCounts[type] ?? 0) + 1
    if (REDRAW_ANNOTATION_TYPES.has(type)) annotationCount++
    if (forbidden.has(type)) {
      issues.error(
        `${path}.type`,
        `entity type '${type}' is forbidden by validation.forbiddenEntityTypes`
      )
    }
    if (entity.id !== undefined) {
      if (typeof entity.id !== 'string' || !entity.id) {
        issues.error(`${path}.id`, 'id must be a non-empty string')
      } else if (ids.has(entity.id)) {
        issues.error(`${path}.id`, `duplicate entity id '${entity.id}'`)
      } else {
        ids.add(entity.id)
      }
    }
    if (entity.viewId !== undefined && !views.has(entity.viewId)) {
      issues.error(`${path}.viewId`, `unknown view '${String(entity.viewId)}'`)
    }
    const coords = entity.coords ?? spec.coords ?? 'cad'
    if (coords !== 'cad' && coords !== 'source') {
      issues.error(`${path}.coords`, 'coords must be \'cad\' or \'source\'')
    } else if (coords === 'source') {
      sourceCoordCount++
      const calibrationId = acexRedrawEntityCalibrationId(spec, entity, views)
      if (!calibrationId) {
        issues.error(
          path,
          'source-coordinate entity needs a calibration (entity.calibration, its view\'s calibration, or a single spec calibration)'
        )
      } else if (!calibrationSpecs.has(calibrationId)) {
        issues.error(
          `${path}.calibration`,
          `unknown calibration '${calibrationId}'`
        )
      }
    }
    if (
      entity.confidence !== undefined &&
      !(
        isFiniteNumber(entity.confidence) &&
        entity.confidence >= 0 &&
        entity.confidence <= 1
      )
    ) {
      issues.error(`${path}.confidence`, 'confidence must be within [0, 1]')
    }
    if (
      entity.color !== undefined &&
      !(
        Number.isInteger(entity.color) &&
        entity.color >= 1 &&
        entity.color <= 255
      )
    ) {
      issues.error(`${path}.color`, 'color must be an ACI integer 1–255')
    }
    if (
      entity.layer !== undefined &&
      (typeof entity.layer !== 'string' || !entity.layer.trim())
    ) {
      issues.error(`${path}.layer`, 'layer must be a non-empty string')
    }
    countEvidence(entity.evidence, `${path}.evidence`)
    if (
      entity.evidence === 'unreadable' &&
      (type === 'text' || type === 'mtext') &&
      typeof entity.text === 'string' &&
      !entity.text.includes('[UNREADABLE]')
    ) {
      issues.warn(
        `${path}.text`,
        'unreadable text should be written as \'[UNREADABLE]\''
      )
    }
    validateEntityGeometry(entity, type, path, issues)
  })

  // Checks: a malformed check would otherwise only surface as a failed check.
  const CHECK_MEASURES = ['length', 'radius', 'distance', 'angle', 'area', 'dimension']
  ;(Array.isArray(spec.checks) ? spec.checks : []).forEach((check, index) => {
    const path = `checks[${index}]`
    if (!check || !CHECK_MEASURES.includes(check.measure)) {
      issues.error(`${path}.measure`, `measure must be one of ${CHECK_MEASURES.join(', ')}`)
      return
    }
    if (!isFiniteNumber(check.expected)) {
      issues.error(`${path}.expected`, 'expected a finite number')
    }
    if (check.measure === 'distance' || check.measure === 'angle') {
      for (const end of ['from', 'to'] as const) {
        const target = check[end]
        const ok =
          typeof target === 'string' ? ids.has(target) : !!acexRedrawPoint(target)
        if (!ok) {
          issues.error(`${path}.${end}`, 'expected a spec entity id or a point [x, y]')
        }
      }
    } else if (typeof check.entity !== 'string' || !ids.has(check.entity)) {
      issues.error(`${path}.entity`, 'expected the id of a spec entity')
    }
  })

  for (const layer of validation.requiredLayers ?? []) {
    const declared =
      (spec.layers ?? []).some(entry => entry?.name === layer) ||
      spec.entities.some(entity => entity?.layer === layer)
    if (!declared) {
      issues.warn(
        'validation.requiredLayers',
        `required layer '${layer}' is not used by any entity`
      )
    }
  }

  // Profile rules
  if (profile === 'strict-dimensioned') {
    if (units === 'unitless') {
      issues.error(
        'units',
        'strict-dimensioned profile cannot use unitless units',
        'blocked'
      )
    }
    const usable = calibrationList.some(
      calibration =>
        (calibration?.evidence === 'known' ||
          calibration?.evidence === 'scaled') &&
        calibrations.has(calibration.id)
    )
    const hasKnownDimensions = spec.entities.some(
      entity =>
        typeof entity?.type === 'string' &&
        entity.type.endsWith('_dimension') &&
        entity.evidence === 'known' &&
        isFiniteNumber(entity.value)
    )
    if (!usable && (sourceCoordCount > 0 || !hasKnownDimensions)) {
      issues.error(
        'calibration',
        'strict-dimensioned profile requires a known/scaled calibration anchor (or CAD-coordinate geometry backed by known dimension values)',
        'blocked'
      )
    }
    if (evidence.unreadable > 0) {
      issues.error(
        'entities',
        `${evidence.unreadable} unreadable item(s) need review before a strict deliverable`,
        'conflict'
      )
    }
  } else if (evidence.unreadable > 0) {
    issues.warn(
      'entities',
      `${evidence.unreadable} unreadable item(s) are marked for review`
    )
  }
  if (profile === 'geometry-only' && annotationCount > 0) {
    issues.warn(
      'entities',
      `${annotationCount} annotation(s) will be skipped by the geometry-only profile`
    )
  }

  return finish()
}

/**
 * Resolves which calibration maps a source-coordinate entity: the entity's
 * own `calibration`, then its view's, then the spec's only calibration.
 */
export function acexRedrawEntityCalibrationId(
  spec: RedrawSpec,
  entity: RedrawEntitySpec,
  views: Map<string, RedrawViewSpec>
): string | undefined {
  if (typeof entity.calibration === 'string') return entity.calibration
  const view =
    typeof entity.viewId === 'string' ? views.get(entity.viewId) : undefined
  if (view?.calibration) return view.calibration
  const list = Array.isArray(spec.calibration) ? spec.calibration : []
  return list.length === 1 ? list[0]?.id : undefined
}
