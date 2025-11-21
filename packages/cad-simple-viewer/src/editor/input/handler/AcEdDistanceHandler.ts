import { AcEdNumericalHandler } from './AcEdNumericalHandler'

/**
 * Validates distance input.
 * Distances must be numeric and normally non-negative (AutoCAD behavior).
 */
export class AcEdDistanceHandler extends AcEdNumericalHandler {}
