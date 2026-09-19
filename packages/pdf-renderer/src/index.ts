/**
 * Native AcGi PDF renderer for `@mlightcad/data-model`.
 *
 * @packageDocumentation
 */

export { exportDatabaseToPdf } from './AcPdfExport'
export type { AcPdfExportOptions } from './AcPdfExportOptions'
export { AcPdfFontManager } from './pdf/AcPdfFontManager'
export type { AcPdfTextFontResolver } from './pdf/AcPdfFontManager'
export type { AcPdfFormRegistry } from './pdf/AcPdfContentWriter'
export { AcPdfEntity } from './renderer/AcPdfEntity'
export { AcPdfRenderer } from './renderer/AcPdfRenderer'
export type { AcPdfStyleContext } from './renderer/AcPdfStyleUtil'
export { AcPdfStyleUtil } from './renderer/AcPdfStyleUtil'
export type {
  AcPdfGlyphBox,
  AcPdfGlyphPrimitives,
  AcPdfGlyphProvider,
  AcPdfMTextGlyphResult,
  AcPdfShapeGlyphResult
} from './text/AcPdfGlyphProvider'
export { tessellateHatchPattern } from './hatch/AcPdfHatchTessellator'
export { shadingFromGradient } from './hatch/AcPdfGradient'
export {
  COMPLEX_LTYPE_ABSOLUTE_ROTATION,
  COMPLEX_LTYPE_SHAPE,
  COMPLEX_LTYPE_TEXT,
  isComplexLineType,
  isComplexShapeElement,
  isComplexTextElement,
  normalizeComplexPattern,
  normalizeComplexPatternElement,
  resolveLinetypeEmbeddedText,
  uprightLinetypeAngle,
  walkLineType
} from './linetype/AcPdfLineTypeStroker'
export type {
  AcPdfComplexPatternElement,
  AcPdfLineWalkPlacement,
  AcPdfLineWalkResult,
  AcPdfLineWalkShape
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
