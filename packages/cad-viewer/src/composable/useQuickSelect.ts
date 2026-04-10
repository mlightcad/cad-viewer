import {
  AcApDocManager,
  AcEdSelectionFilter
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbDxfCode,
  AcDbEntity,
  AcDbObjectId,
  AcDbTypedValue
} from '@mlightcad/data-model'

/**
 * Input scope for Quick Select:
 * - entireDrawing: use all entities in model space as filter source
 * - currentSelection: use only currently selected entities as filter source
 */
export type MlQuickSelectApplyTo = 'entireDrawing' | 'currentSelection'

/**
 * Properties supported by Quick Select filtering.
 * All values are read directly from AcDbEntity fields.
 */
export type MlQuickSelectProperty =
  | 'objectType'
  | 'layer'
  | 'color'
  | 'lineType'
  | 'lineWeight'

/**
 * Operators supported by Quick Select.
 * - String properties: equals / notEquals
 * - Numeric properties (currently lineWeight): full comparison operators
 */
export type MlQuickSelectOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'

/**
 * How Quick Select applies results to the active selection set.
 * - set: replace current selection with matched results
 * - add: append matched results to current selection
 * - remove: remove matched results from current selection
 */
export type MlQuickSelectSelectionMode = 'set' | 'add' | 'remove'

/** Full criteria payload for Quick Select. */
export interface MlQuickSelectCriteria {
  /** Source scope (entire drawing or current selection) */
  applyTo: MlQuickSelectApplyTo
  /** Optional object type constraint; undefined means no type filter */
  objectType?: string
  /** Target property used for comparison */
  property: MlQuickSelectProperty
  /** Comparison operator */
  operator: MlQuickSelectOperator
  /** Target value (UI sends string; numeric properties are parsed internally) */
  value: string
  /** How matched results are applied to selection set */
  selectionMode: MlQuickSelectSelectionMode
}

/** Result of a Quick Select execution. */
export interface MlQuickSelectResult {
  /** Number of source objects used for filtering */
  sourceCount: number
  /** Number of objects that satisfy criteria */
  matchedCount: number
  /** Object IDs that satisfy criteria */
  matchedIds: AcDbObjectId[]
}

/**
 * Internal source item for filtering.
 * Keeps both objectId and entity to avoid repeated lookups.
 */
interface MlQuickSelectSourceItem {
  id: AcDbObjectId
  entity: AcDbEntity
}

/**
 * Returns whether the target property is numeric.
 * Used to branch comparison and operator logic.
 */
function isNumericProperty(property: MlQuickSelectProperty) {
  return property === 'lineWeight'
}

/**
 * Reads a property value from an entity.
 * Missing fields fall back to defaults to keep comparison stable.
 */
function getEntityPropertyValue(
  entity: AcDbEntity,
  property: MlQuickSelectProperty
): string | number {
  switch (property) {
    case 'objectType':
      return entity.type ?? ''
    case 'layer':
      return entity.layer ?? ''
    case 'color':
      return entity.color?.toString() ?? ''
    case 'lineType':
      return entity.lineType ?? ''
    case 'lineWeight':
      return entity.lineWeight ?? 0
    default:
      return ''
  }
}

/**
 * Maps Quick Select property names to DXF group codes consumed by
 * {@link AcEdSelectionFilter}.
 */
function getDxfCodeByProperty(property: MlQuickSelectProperty): AcDbDxfCode {
  switch (property) {
    case 'objectType':
      return AcDbDxfCode.Start
    case 'layer':
      return AcDbDxfCode.LayerName
    case 'color':
      return AcDbDxfCode.ColorName
    case 'lineType':
      return AcDbDxfCode.LinetypeName
    case 'lineWeight':
      return AcDbDxfCode.LineWeight
    default:
      return AcDbDxfCode.Start
  }
}

function toOperatorToken(operator: MlQuickSelectOperator): string {
  switch (operator) {
    case 'equals':
      return '='
    case 'notEquals':
      return '!='
    case 'greaterThan':
      return '>'
    case 'greaterThanOrEqual':
      return '>='
    case 'lessThan':
      return '<'
    case 'lessThanOrEqual':
      return '<='
    default:
      return '='
  }
}

function buildSelectionFilter(
  criteria: Pick<
    MlQuickSelectCriteria,
    'objectType' | 'property' | 'operator' | 'value'
  >
) {
  const values: AcDbTypedValue[] = []

  if (criteria.objectType) {
    values.push({
      code: AcDbDxfCode.Start,
      value: criteria.objectType
    })
  }

  values.push({
    code: AcDbDxfCode.Operator,
    value: toOperatorToken(criteria.operator)
  })

  values.push({
    code: getDxfCodeByProperty(criteria.property),
    value: isNumericProperty(criteria.property)
      ? Number(criteria.value)
      : criteria.value
  })

  return new AcEdSelectionFilter(values)
}

/**
 * Collects source items for current Quick Select run.
 *
 * Behavior:
 * 1. currentSelection: iterate selected IDs and resolve entities from model space
 * 2. entireDrawing: iterate all entities in model space
 * 3. Return normalized { id, entity } items for reuse in filter/statistics
 */
function collectSourceItems(
  applyTo: MlQuickSelectApplyTo
): MlQuickSelectSourceItem[] {
  const doc = AcApDocManager.instance.curDocument
  const modelSpace = doc.database.tables.blockTable.modelSpace
  const result: MlQuickSelectSourceItem[] = []

  if (applyTo === 'currentSelection') {
    const ids = AcApDocManager.instance.curView.selectionSet.ids
    for (const id of ids) {
      const entity = modelSpace.getIdAt(id)
      if (entity) {
        result.push({ id, entity })
      }
    }
    return result
  }

  const iterator = modelSpace.newIterator()
  for (const entity of iterator) {
    result.push({
      id: entity.objectId,
      entity
    })
  }
  return result
}

/**
 * Returns deduplicated, sorted object types for UI dropdown.
 */
export function getQuickSelectObjectTypes(
  applyTo: MlQuickSelectApplyTo
): string[] {
  const items = collectSourceItems(applyTo)
  return Array.from(new Set(items.map(item => item.entity.type))).sort((a, b) =>
    a.localeCompare(b)
  )
}

/**
 * Returns candidate values for a property (used by UI Value dropdown).
 *
 * @param applyTo - source scope (entire drawing / current selection)
 * @param property - target property
 * @param objectType - optional type filter
 * @returns deduplicated string values; numeric values sorted numerically
 */
export function getQuickSelectPropertyValues(
  applyTo: MlQuickSelectApplyTo,
  property: MlQuickSelectProperty,
  objectType?: string
): string[] {
  const items = collectSourceItems(applyTo).filter(item =>
    objectType ? item.entity.type === objectType : true
  )

  const values = new Set<string>()
  for (const item of items) {
    values.add(String(getEntityPropertyValue(item.entity, property)))
  }

  const all = Array.from(values)
  if (isNumericProperty(property)) {
    return all.sort((a, b) => Number(a) - Number(b))
  }
  return all.sort((a, b) => a.localeCompare(b))
}

/**
 * Counts matched objects without mutating selection set.
 * Typically used for live preview in the dialog.
 */
export function getQuickSelectMatchedCount(
  criteria: MlQuickSelectCriteria
): number {
  const filter = buildSelectionFilter(criteria)

  if (criteria.applyTo === 'entireDrawing') {
    const result = AcApDocManager.instance.editor.selectAll(filter)
    return result.value?.count ?? 0
  }

  return collectSourceItems(criteria.applyTo).filter(item =>
    filter.matches(item.entity)
  ).length
}

/**
 * Returns source count (optionally pre-filtered by object type).
 * Used to show total candidate objects in UI.
 */
export function getQuickSelectSourceCount(
  applyTo: MlQuickSelectApplyTo,
  objectType?: string
): number {
  return collectSourceItems(applyTo).filter(item =>
    objectType ? item.entity.type === objectType : true
  ).length
}

/**
 * Executes Quick Select and applies results to active selection set.
 *
 * Modes:
 * - set: clear current selection, then add all matches
 * - add: add only matches not already selected
 * - remove: remove only matches that are currently selected
 *
 * @returns source count, matched count, and matched object IDs
 */
export function applyQuickSelect(
  criteria: MlQuickSelectCriteria
): MlQuickSelectResult {
  const source = collectSourceItems(criteria.applyTo)
  const filter = buildSelectionFilter(criteria)
  const matchedIds: AcDbObjectId[] =
    criteria.applyTo === 'entireDrawing'
      ? (AcApDocManager.instance.editor.selectAll(filter).value?.ids ?? [])
      : source.filter(item => filter.matches(item.entity)).map(item => item.id)
  const selectionSet = AcApDocManager.instance.curView.selectionSet

  switch (criteria.selectionMode) {
    case 'set': {
      selectionSet.clear()
      if (matchedIds.length > 0) {
        selectionSet.add(matchedIds)
      }
      break
    }
    case 'add': {
      const unique = matchedIds.filter(id => !selectionSet.has(id))
      if (unique.length > 0) {
        selectionSet.add(unique)
      }
      break
    }
    case 'remove': {
      const existing = matchedIds.filter(id => selectionSet.has(id))
      if (existing.length > 0) {
        selectionSet.delete(existing)
      }
      break
    }
    default:
      break
  }

  return {
    sourceCount: source.length,
    matchedCount: matchedIds.length,
    matchedIds
  }
}
