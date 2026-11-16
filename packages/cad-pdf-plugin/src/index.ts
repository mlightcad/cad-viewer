/**
 * PDF export and import plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export { AcApConvertToPdfCmd } from './AcApConvertToPdfCmd.js'
export { AcApImportPdfCmd } from './AcApImportPdfCmd.js'
export { AcApImportPdfPromptCmd } from './AcApImportPdfPromptCmd.js'
export { AcApPdfBlockCmd } from './AcApPdfBlockCmd.js'
export { AcApPdfDimCmd } from './AcApPdfDimCmd.js'
export {
  AcApPdfDimSession,
  type AcApPdfDimSessionInput,
  type PdfDimRow,
  type PdfDimStyleNameError
} from './AcApPdfDimSession.js'
export { AcApPdfHatchCmd } from './AcApPdfHatchCmd.js'
export { AcApPdfConvertor } from './AcApPdfConvertor.js'
export { resolveViewerTextFont } from './AcApPdfFontResolver.js'
export {
  type AcApPdfColorMode,
  type AcApPdfExportOptions,
  type AcApPdfModelSpaceFit,
  type AcApPdfTextMode,
  resolveAcApPdfExportOptions
} from './AcApPdfExportOptions.js'
export { AcApPdfImportConvertor } from './AcApPdfImportConvertor.js'
export {
  acapPdfDefaultImportResourceUrls,
  acapPdfImportResourceUrls,
  type AcApPdfImportResourceUrls,
  acapPdfSetImportResourceUrls
} from './AcApPdfImportResources.js'
export {
  type AcApPdfImportMode,
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions.js'
export { AcApPdfScaleCmd } from './AcApPdfScaleCmd.js'
export { AcApPdfTextCmd } from './AcApPdfTextCmd.js'
export {
  acapPdfCreateDimensions,
  acapPdfDimStyleMetrics,
  acapPdfDimStyleOverrides,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  type AcApPdfDimStyleMetrics,
  PDF_DIM_STYLE,
  pdfEntitiesToDimInput
} from './pdfDimensionConvert.js'
export { pdfEntityToFeature } from './pdfDeprecatedMatching.js'
export { pdfEntityToStroke } from './pdfEntityStrokes.js'
export {
  buildPdfImportShapes,
  type PdfImportShapeItem,
  type PdfImportShapeResult,
  type PdfImportShapeStats
} from './pdfImportShapes.js'
export type { AcApPdfPluginOptions } from './AcApPdfPlugin.js'
export { AcApPdfPlugin } from './AcApPdfPlugin.js'
export { createPdfPlugin } from './createPdfPlugin.js'
export {
  applyPdfImportContrastColors,
  detectPdfImportPaperTone,
  extractPdfImportSubpaths,
  PDF_IMPORT_FOREGROUND_COLOR,
  PDF_PT_TO_MM,
  remapPdfImportColor,
  type PdfImportExtractOptions,
  type PdfImportOcgLayer,
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
} from './pdfVectorImport.js'
export {
  type PdfCurveRecognitionOptions,
  type PdfRecognizedShape,
  type PdfRecognizedVertex,
  recognizePdfCurves
} from './recognition/pdfCurveRecognition.js'
export {
  clusterPdfTextStrokes,
  estimatePdfTextHeight,
  type PdfTextClusterOptions,
  type PdfTextClusterResult,
  type PdfTextGlyph,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering.js'
export {
  PdfGlyphDictionary,
  pdfGlyphSignature
} from './recognition/pdfGlyphDictionary.js'
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
} from './recognition/pdfDimensionPattern.js'
export {
  acapPdfAttachDimStrokeTexts,
  acapPdfCollectDimStrokeLines,
  acapPdfDimTextsFromStrokeLines,
  acapPdfLookupDimStrokeTexts,
  acapPdfPrepareDimStrokeTexts,
  pdfDimTextPlacement
} from './pdfDimStrokeTexts.js'
export {
  recognizePdfDimGlyph,
  recognizePdfDimStrokeText
} from './recognition/pdfDimDigitRecognition.js'
export {
  buildPdfFormBlocks,
  type PdfFormBlock,
  type PdfFormBlockOptions,
  type PdfFormBlockReference,
  type PdfFormBlockResult,
  type PdfFormBlockShape
} from './recognition/pdfFormBlocks.js'
export {
  applyPdfAffine,
  findPdfShapeMatches,
  type PdfAffine,
  type PdfMatchFeature,
  type PdfShapeMatch,
  type PdfShapeMatchOptions
} from './pdfDeprecatedMatching.js'
export {
  acapPdfCreateRecoveredHatch,
  acapPdfHatchPatternLabel,
  acapPdfRecoverHatches,
  type PdfHatchInput,
  type PdfHatchRecovery,
  pdfEntitiesToHatchInput,
  type PdfRecoveredHatch
} from './pdfHatchRecover.js'
export {
  acapPdfFaceArrangement,
  acapPdfFaceBoundary,
  acapPdfFaceBoundaryIn,
  acapPdfShapePolyline,
  type PdfFaceArrangement,
  type PdfFaceBoundaryOptions
} from './recognition/pdfHatchFaces.js'
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
} from './recognition/pdfHatchRecognition.js'
export {
  mergePdfTextRuns,
  type PdfTextRunMergeOptions
} from './recognition/pdfTextRunMerge.js'
export { PDF_PLUGIN_NAME, PDF_PLUGIN_TRIGGERS } from './register.js'
export {
  AcUiPdfDimPanel,
  type AcUiPdfDimPanelOptions
} from './ui/AcUiPdfDimPanel.js'
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
} from './ui/AcUiPdfImportDialog.js'
