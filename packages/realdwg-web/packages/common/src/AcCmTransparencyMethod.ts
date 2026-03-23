/**
 * Defines how transparency is interpreted.
 *
 * This mirrors the `transparencyMethod` enum from ObjectARX:
 * - ByLayer: Use the layer’s transparency
 * - ByBlock: Use a parent block’s transparency
 * - ByAlpha: Use a specific alpha value
 * - ErrorValue: Invalid transparency state
 */
export enum AcCmTransparencyMethod {
  ByLayer = 0,
  ByBlock = 1,
  ByAlpha = 2,
  ErrorValue = 3
}
