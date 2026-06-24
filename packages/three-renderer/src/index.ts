export * from './batch/AcTrBatchedGroup'
export {
  isBatchGeometryActive,
  isBatchGeometryVisible
} from './batch/AcTrBatchedGeometryInfo'
export * from './draw'
export { AcTrBatchedLine } from './batch/AcTrBatchedLine'
export { AcTrBatchedLine2 } from './batch/AcTrBatchedLine2'
export { AcTrBatchedMesh } from './batch/AcTrBatchedMesh'
export { AcTrBatchedPoint } from './batch/AcTrBatchedPoint'
export * from './object/AcTrObject'
export * from './object/AcTrEntity'
export * from './object/AcTrGroup'
export * from './object/AcTrHtmlTransientManager'
export * from './object/AcTrTransientManager'
export * from './object/AcTrPreviewOverlayManager'
export * from './renderer'
export * from './viewport'
export * from './style/AcTrMaterialMetadata'
export { AcTrLinePatternShaders } from './style/AcTrLinePatternShaders'
export {
  createGradientHatchShaderMaterial,
  createGradientHatchShaderMaterialFromUniforms,
  type AcTrGradientHatchStyle
} from './style/AcTrGradientHatchShaders'
export {
  createHatchPatternShaderMaterial,
  type AcTrPatternLine
} from './style/AcTrHatchPatternShaders'
export * from './util/AcTrMTextColorUtil'
export { AcTrMatrixUtil } from './util/AcTrMatrixUtil'
export {
  isHighlightCloneDrawable,
  isHighlightOverlayDescendant,
  markHighlightOverlayGroup,
  type AcTrHighlightOverlayGroup,
  type AcTrHighlightOverlayGroupUserData
} from './util/AcTrObjectUserData'
export { isObjectHierarchyVisible } from './util/AcTrVisibility'
