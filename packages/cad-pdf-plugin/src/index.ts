/**
 * PDF export and import plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd'
export { AcApImportPdfCmd } from './AcApImportPdfCmd'
export { AcApPdfConvertor } from './AcApPdfConvertor'
export { resolveViewerTextFont } from './AcApPdfFontResolver'
export {
  type AcApPdfColorMode,
  type AcApPdfExportOptions,
  type AcApPdfModelSpaceFit,
  type AcApPdfTextMode,
  resolveAcApPdfExportOptions
} from './AcApPdfExportOptions'
export { AcApPdfImportConvertor } from './AcApPdfImportConvertor'
export {
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions'
export { AcApPdfScaleCmd } from './AcApPdfScaleCmd'
export {
  buildPdfImportShapes,
  type PdfImportShapeItem,
  type PdfImportShapeResult,
  type PdfImportShapeStats
} from './pdfImportShapes'
export type { AcApPdfPluginOptions } from './AcApPdfPlugin'
export { AcApPdfPlugin } from './AcApPdfPlugin'
export { createPdfPlugin } from './createPdfPlugin'
export {
  applyPdfImportContrastColors,
  detectPdfImportPaperTone,
  extractPdfImportSubpaths,
  PDF_IMPORT_FOREGROUND_COLOR,
  PDF_PT_TO_MM,
  remapPdfImportColor,
  type PdfImportExtractOptions,
  type PdfImportOps,
  type PdfImportPageContent,
  type PdfImportPaperTone,
  type PdfImportedSubpath,
  type PdfImportedText,
  type PdfImportPoint,
  type PdfImportSegment,
  type PdfImportViewport
} from './pdfVectorImport'
export {
  type PdfCurveRecognitionOptions,
  type PdfRecognizedShape,
  type PdfRecognizedVertex,
  recognizePdfCurves
} from './recognition/pdfCurveRecognition'
export { PDF_PLUGIN_NAME, PDF_PLUGIN_TRIGGERS } from './register'
