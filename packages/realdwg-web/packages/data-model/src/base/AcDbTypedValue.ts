import { AcDbDxfCode } from './AcDbDxfCode'

/**
 * Represents a single typed value stored in an
 * {@link AcDbResultBuffer}.
 *
 * @typeParam T - The JavaScript type of the value.
 *
 * @remarks
 * This is the TypeScript equivalent of AutoCAD's TypedValue
 * structure. The {@link AcDbDxfCode} determines how the value
 * should be interpreted.
 */
export interface AcDbTypedValue<T = unknown> {
  /** DXF group code describing the value */
  code: AcDbDxfCode

  /** The actual stored value */
  value: T
}
