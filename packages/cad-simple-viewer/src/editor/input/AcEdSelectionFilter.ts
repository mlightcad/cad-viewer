import { AcDbDxfCode, AcDbEntity, AcDbTypedValue } from '@mlightcad/data-model'

type AcEdComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'

/**
 * Represents one entity filter expression for selection operations.
 *
 * This class is inspired by AutoCAD .NET `SelectionFilter`, where filter clauses
 * are expressed by typed DXF values. Conditions are evaluated with AND semantics.
 *
 * Supported typed values:
 * - `AcDbDxfCode.Start`          => entity type (DXF type or runtime type)
 * - `AcDbDxfCode.LayerName`      => layer name
 * - `AcDbDxfCode.ColorName`      => `entity.color.toString()`
 * - `AcDbDxfCode.LinetypeName`   => line type name
 * - `AcDbDxfCode.LineWeight`     => lineweight
 * - `AcDbDxfCode.Operator`       => comparison operator for next clause
 *
 * Supported operator tokens:
 * - `=`, `==`
 * - `!=`, `<>`
 * - `>`, `>=`, `<`, `<=`
 */
export class AcEdSelectionFilter {
  private readonly _typedValues: AcDbTypedValue[]

  constructor(values: AcDbTypedValue[] = []) {
    this._typedValues = [...values]
  }

  /**
   * Returns typed values used by this filter.
   */
  get typedValues() {
    return [...this._typedValues]
  }

  /**
   * Returns whether the specified entity satisfies all filter clauses.
   */
  matches(entity: AcDbEntity): boolean {
    if (this._typedValues.length === 0) {
      return true
    }

    let pendingOp: AcEdComparisonOperator = 'equals'
    for (const tv of this._typedValues) {
      if (tv.code === AcDbDxfCode.Operator) {
        pendingOp = this.parseOperator(tv.value)
        continue
      }

      if (!this.matchTypedValue(entity, tv, pendingOp)) {
        return false
      }
      pendingOp = 'equals'
    }

    return true
  }

  /**
   * Parses one operator token from typed-value input.
   *
   * Accepted tokens follow common AutoCAD comparison syntax. Unknown values
   * safely fall back to equality.
   *
   * @param raw - Raw operator token (usually from `AcDbDxfCode.Operator`)
   * @returns Normalized internal comparison operator
   */
  private parseOperator(raw: unknown): AcEdComparisonOperator {
    const text = String(raw ?? '').trim()
    switch (text) {
      case '!=':
      case '<>':
        return 'notEquals'
      case '>':
        return 'greaterThan'
      case '>=':
        return 'greaterThanOrEqual'
      case '<':
        return 'lessThan'
      case '<=':
        return 'lessThanOrEqual'
      case '=':
      case '==':
      default:
        return 'equals'
    }
  }

  /**
   * Evaluates whether one typed-value clause matches the given entity.
   *
   * The method first resolves an entity-side value by DXF code, then compares
   * it with the filter value using the operator currently in effect.
   *
   * @param entity - Entity being tested
   * @param tv - Typed-value clause (`code` + `value`)
   * @param op - Comparison operator for this clause
   * @returns `true` if the clause matches; otherwise `false`
   */
  private matchTypedValue(
    entity: AcDbEntity,
    tv: AcDbTypedValue,
    op: AcEdComparisonOperator
  ): boolean {
    const actual = this.resolveEntityValue(entity, tv.code)
    if (actual === undefined || actual === null) {
      return false
    }
    return this.compare(actual, tv.value, op)
  }

  /**
   * Resolves the entity property value associated with one DXF group code.
   *
   * Only codes used by current Quick Select flow are mapped. Unsupported
   * codes return `undefined` and are treated as non-matching clauses.
   *
   * @param entity - Source entity
   * @param code - DXF code indicating which property to read
   * @returns Resolved value for comparison, or `undefined` if unsupported
   */
  private resolveEntityValue(entity: AcDbEntity, code: AcDbDxfCode) {
    switch (code) {
      case AcDbDxfCode.Start:
        return entity.dxfTypeName || entity.type
      case AcDbDxfCode.LayerName:
        return entity.layer
      case AcDbDxfCode.ColorName:
        return entity.color?.toString()
      case AcDbDxfCode.LinetypeName:
        return entity.lineType
      case AcDbDxfCode.LineWeight:
        return Number(entity.lineWeight)
      default:
        return undefined
    }
  }

  /**
   * Compares runtime value and filter value with the given operator.
   *
   * Comparison strategy:
   * - Numeric path: when both values are finite numbers
   * - String path: case-insensitive lexicographic comparison otherwise
   *
   * @param actual - Runtime value resolved from entity
   * @param expected - Target value from filter clause
   * @param op - Comparison operator
   * @returns `true` when comparison succeeds; otherwise `false`
   */
  private compare(
    actual: unknown,
    expected: unknown,
    op: AcEdComparisonOperator
  ): boolean {
    const actualNum = Number(actual)
    const expectedNum = Number(expected)
    const numeric =
      Number.isFinite(actualNum) &&
      Number.isFinite(expectedNum) &&
      `${actual}`.trim() !== '' &&
      `${expected}`.trim() !== ''

    if (numeric) {
      switch (op) {
        case 'equals':
          return actualNum === expectedNum
        case 'notEquals':
          return actualNum !== expectedNum
        case 'greaterThan':
          return actualNum > expectedNum
        case 'greaterThanOrEqual':
          return actualNum >= expectedNum
        case 'lessThan':
          return actualNum < expectedNum
        case 'lessThanOrEqual':
          return actualNum <= expectedNum
      }
    }

    const left = String(actual).toLowerCase()
    const right = String(expected).toLowerCase()
    switch (op) {
      case 'equals':
        return left === right
      case 'notEquals':
        return left !== right
      case 'greaterThan':
        return left > right
      case 'greaterThanOrEqual':
        return left >= right
      case 'lessThan':
        return left < right
      case 'lessThanOrEqual':
        return left <= right
    }
  }
}
