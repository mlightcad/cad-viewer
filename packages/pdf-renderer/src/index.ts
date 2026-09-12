/**
 * Native AcGi PDF renderer for `@mlightcad/data-model`.
 *
 * @packageDocumentation
 */

export { exportDatabaseToPdf } from './AcPdfExport'
export type { AcPdfExportOptions } from './AcPdfExportOptions'
export { AcPdfEntity } from './renderer/AcPdfEntity'
export { AcPdfRenderer } from './renderer/AcPdfRenderer'
export type { AcPdfStyleContext } from './renderer/AcPdfStyleUtil'
export { AcPdfStyleUtil } from './renderer/AcPdfStyleUtil'
export type {
  AcPdfGlyphBox,
  AcPdfGlyphPrimitive,
  AcPdfGlyphProvider,
  AcPdfMTextGlyphResult,
  AcPdfShapeGlyphResult
} from './text/AcPdfGlyphProvider'
export { tessellateHatchPattern } from './hatch/AcPdfHatchTessellator'
export { shadingFromGradient } from './hatch/AcPdfGradient'
export {
  isComplexLineType,
  walkLineType
} from './linetype/AcPdfLineTypeStroker'
export { effectivePdfLayer } from './pdf/AcPdfEffectiveLayer'
export {
  clampPageSize,
  drawingUnitsToPdfPoints,
  lineWeightToDrawingUnits,
  mmPerDrawingUnit,
  mmToPdfPoints,
  PDF_MAX_PAGE_SIZE,
  PDF_POINTS_PER_MM
} from './AcPdfUnits'
