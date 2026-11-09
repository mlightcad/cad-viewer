/**
 * PDF export and import plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd'
export { AcApImportPdfCmd } from './AcApImportPdfCmd'
export { AcApPdfBlockCmd } from './AcApPdfBlockCmd'
export { AcApPdfDimCmd } from './AcApPdfDimCmd'
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
  acapPdfDefaultImportResourceUrls,
  acapPdfImportResourceUrls,
  type AcApPdfImportResourceUrls,
  acapPdfSetImportResourceUrls
} from './AcApPdfImportResources'
export {
  type AcApPdfImportMode,
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions'
export { AcApPdfScaleCmd } from './AcApPdfScaleCmd'
export { AcApPdfTextCmd } from './AcApPdfTextCmd'
export {
  acapPdfCreateDimensions,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  PDF_DIM_STYLE,
  pdfEntitiesToDimInput
} from './pdfDimensionConvert'
export { pdfEntityToFeature } from './pdfEntityFeatures'
export { pdfEntityToStroke } from './pdfEntityStrokes'
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
  type PdfImportedImage,
  type PdfImportedText,
  type PdfImportFormInstance,
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
export {
  clusterPdfTextStrokes,
  estimatePdfTextHeight,
  type PdfTextClusterOptions,
  type PdfTextClusterResult,
  type PdfTextGlyph,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering'
export {
  PdfGlyphDictionary,
  pdfGlyphSignature
} from './recognition/pdfGlyphDictionary'
export {
  parsePdfDimensionValue,
  pdfArrowFromPolygon,
  type PdfAngularDimension,
  type PdfDimArc,
  type PdfDimCurve,
  type PdfDimensionCandidate,
  type PdfDimensionOptions,
  type PdfDimInput,
  type PdfDimPolygon,
  type PdfDimSegment,
  type PdfDimText,
  type PdfLinearDimension,
  type PdfRadialDimension,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern'
export {
  buildPdfFormBlocks,
  type PdfFormBlock,
  type PdfFormBlockOptions,
  type PdfFormBlockReference,
  type PdfFormBlockResult,
  type PdfFormBlockShape
} from './recognition/pdfFormBlocks'
export {
  applyPdfAffine,
  findPdfShapeMatches,
  type PdfAffine,
  type PdfMatchFeature,
  type PdfShapeMatch,
  type PdfShapeMatchOptions
} from './recognition/pdfShapeMatching'
export {
  mergePdfTextRuns,
  type PdfTextRunMergeOptions
} from './recognition/pdfTextRunMerge'
export { PDF_PLUGIN_NAME, PDF_PLUGIN_TRIGGERS } from './register'
