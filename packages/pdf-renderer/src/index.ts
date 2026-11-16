/**
 * Native AcGi PDF renderer for `@mlightcad/data-model`.
 *
 * @packageDocumentation
 */

export { exportDatabaseToPdf } from './AcPdfExport.js'
export type { AcPdfExportOptions } from './AcPdfExportOptions.js'
export type { AcPdfColorMode } from './renderer/AcPdfStyle.js'
export {
  AcPdfFontManager,
  acPdfTrueTypeGlyfLooksHealthy
} from './pdf/AcPdfFontManager.js'
export type { AcPdfTextFontResolver } from './pdf/AcPdfFontManager.js'
export type { AcPdfFormRegistry } from './pdf/AcPdfContentWriter.js'
export { AcPdfEntity } from './renderer/AcPdfEntity.js'
export { AcPdfRenderer } from './renderer/AcPdfRenderer.js'
export type { AcPdfStyleContext } from './renderer/AcPdfStyleUtil.js'
export { AcPdfStyleUtil } from './renderer/AcPdfStyleUtil.js'
export type {
  AcPdfGlyphBox,
  AcPdfGlyphColorGroup,
  AcPdfGlyphColorSettings,
  AcPdfGlyphPrimitives,
  AcPdfGlyphProvider,
  AcPdfMTextGlyphResult,
  AcPdfShapeGlyphResult
} from './text/AcPdfGlyphProvider.js'
export { tessellateHatchPattern } from './hatch/AcPdfHatchTessellator.js'
export { shadingFromGradient } from './hatch/AcPdfGradient.js'
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
} from './linetype/AcPdfLineTypeStroker.js'
export type {
  AcPdfComplexPatternElement,
  AcPdfLineWalkPlacement,
  AcPdfLineWalkResult,
  AcPdfLineWalkShape
} from './linetype/AcPdfLineTypeStroker.js'
export { effectivePdfLayer } from './pdf/AcPdfEffectiveLayer.js'
export {
  clampPageSize,
  drawingUnitsToPdfPoints,
  lineWeightToDrawingUnits,
  mmPerDrawingUnit,
  mmToPdfPoints,
  PDF_MAX_PAGE_SIZE,
  PDF_POINTS_PER_MM
} from './AcPdfUnits.js'
