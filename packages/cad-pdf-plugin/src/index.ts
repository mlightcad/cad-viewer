/**
 * PDF export and import plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd'
export { AcApImportPdfCmd } from './AcApImportPdfCmd'
export { AcApImportPdfPromptCmd } from './AcApImportPdfPromptCmd'
export { AcApPdfBlockCmd } from './AcApPdfBlockCmd'
export { AcApPdfDimCmd } from './AcApPdfDimCmd'
export {
  AcApPdfDimSession,
  type AcApPdfDimSessionInput,
  type PdfDimRow,
  type PdfDimStyleNameError
} from './AcApPdfDimSession'
export { AcApPdfHatchCmd } from './AcApPdfHatchCmd'
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
  acapPdfDimStyleMetrics,
  acapPdfDimStyleOverrides,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  type AcApPdfDimStyleMetrics,
  PDF_DIM_STYLE,
  pdfEntitiesToDimInput
} from './pdfDimensionConvert'
export { pdfEntityToFeature } from './pdfDeprecatedMatching'
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
  pdfDimTextIds,
  type PdfAngularDimension,
  type PdfDimArc,
  type PdfDimCurve,
  type PdfDimensionCandidate,
  type PdfDimensionOptions,
  type PdfDimInput,
  type PdfDimPolygon,
  type PdfDimSegment,
  type PdfDimText,
  type PdfDimUnreadText,
  type PdfLinearDimension,
  type PdfRadialDimension,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern'
export {
  acapPdfAttachDimStrokeTexts,
  acapPdfCollectDimStrokeLines,
  acapPdfDimTextsFromStrokeLines,
  acapPdfLookupDimStrokeTexts,
  acapPdfPrepareDimStrokeTexts,
  pdfDimTextPlacement
} from './pdfDimStrokeTexts'
export {
  recognizePdfDimGlyph,
  recognizePdfDimStrokeText
} from './recognition/pdfDimDigitRecognition'
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
} from './pdfDeprecatedMatching'
export {
  acapPdfCreateRecoveredHatch,
  acapPdfHatchPatternLabel,
  acapPdfRecoverHatches,
  type PdfHatchInput,
  type PdfHatchRecovery,
  pdfEntitiesToHatchInput,
  type PdfRecoveredHatch
} from './pdfHatchRecover'
export {
  acapPdfFaceArrangement,
  acapPdfFaceBoundary,
  acapPdfFaceBoundaryIn,
  acapPdfShapePolyline,
  type PdfFaceArrangement,
  type PdfFaceBoundaryOptions
} from './recognition/pdfHatchFaces'
export {
  acapPdfBoundaryAt,
  acapPdfFitHatch,
  acapPdfMatchHatch,
  acapPdfRecognizeHatches,
  CUSTOM_PATTERN_NAME,
  type PdfHatchDefinitionLine,
  type PdfHatchFit,
  type PdfHatchFitOptions,
  type PdfHatchMatch,
  type PdfHatchPatternRequest,
  type PdfHatchRecognitionOptions,
  type PdfHatchRecognitionResult,
  type PdfHatchTrace,
  type PdfRecognizedHatch,
  type PdfRecognizedHatchPattern
} from './recognition/pdfHatchRecognition'
export {
  mergePdfTextRuns,
  type PdfTextRunMergeOptions
} from './recognition/pdfTextRunMerge'
export { PDF_PLUGIN_NAME, PDF_PLUGIN_TRIGGERS } from './register'
export {
  AcUiPdfDimPanel,
  type AcUiPdfDimPanelOptions
} from './ui/AcUiPdfDimPanel'
export {
  AcUiPdfImportDialog,
  type AcUiPdfImportDialogOptions,
  type AcUiPdfImportDialogResult,
  type AcUiPdfImportDialogValues,
  type AcUiPdfImportDocument,
  type AcUiPdfImportPage,
  type AcUiPdfImportRenderTask,
  type AcUiPdfImportSource,
  type AcUiPdfImportViewport
} from './ui/AcUiPdfImportDialog'
