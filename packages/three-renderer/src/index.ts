import './types/three-material.js'

export * from './batch/AcTrBatchedGroup.js'
export { AcTrMeshGlyphWorldBatch } from './batch/AcTrMeshGlyphWorldBatch.js'
export {
  isBatchGeometryActive,
  isBatchGeometryVisible
} from './batch/AcTrBatchedGeometryInfo.js'
export * from './draw/index.js'
export { AcTrBatchedLine } from './batch/AcTrBatchedLine.js'
export { AcTrBatchedLine2 } from './batch/AcTrBatchedLine2.js'
export { AcTrBatchedMesh } from './batch/AcTrBatchedMesh.js'
export { AcTrBatchedPoint } from './batch/AcTrBatchedPoint.js'
export * from './linetype/index.js'
export * from './object/AcTrObject.js'
export * from './object/AcTrEntity.js'
export {
  setHeadlessRasterDecoder,
  type AcTrHeadlessRasterDecoder,
  type AcTrHeadlessRasterImage
} from './object/AcTrImage.js'
export * from './object/AcTrGlyphEntity.js'
export * from './object/AcTrMText.js'
export * from './object/AcTrShape.js'
export * from './object/AcTrLineGeometryBuilder.js'
export * from './object/AcTrGroup.js'
export * from './html/index.js'
export * from './object/AcTrTransientManager.js'
export * from './object/AcTrPreviewOverlayManager.js'
export * from './renderer/index.js'
export * from './viewport/index.js'
export * from './style/AcTrMaterialMetadata.js'
export {
  applyLineWeightDisplay,
  AcTrLineMaterialManager
} from './style/AcTrLineMaterialManager.js'
export { AcTrLinePatternShaders } from './style/AcTrLinePatternShaders.js'
export { AcTrStyleManager, type AcTrStyleManagerStats } from './style/AcTrStyleManager.js'
export {
  type AcTrMaterialCacheStats
} from './style/AcTrMaterialManager.js'
export {
  createGradientHatchShaderMaterial,
  createGradientHatchShaderMaterialFromUniforms,
  type AcTrGradientHatchStyle
} from './style/AcTrGradientHatchShaders.js'
export {
  createHatchPatternShaderMaterial,
  type AcTrPatternLine
} from './style/AcTrHatchPatternShaders.js'
export { wrapPatternBaseToLocalFrame } from './style/AcTrFillMaterialManager.js'
export * from './util/AcTrMTextColorUtil.js'
export { AcTrMatrixUtil } from './util/AcTrMatrixUtil.js'
export {
  getSceneDrawableUserData,
  isHighlightCloneDrawable,
  isHighlightOverlayDescendant,
  resolveDrawableExportMaterial,
  markHighlightOverlayGroup,
  patchDrawableMaterialFromCache,
  resolveCachedMaterialRemap,
  syncStyleMaterialIdFromMaterials,
  type AcTrHighlightOverlayGroup,
  type AcTrHighlightOverlayGroupUserData
} from './util/AcTrObjectUserData.js'
export { isObjectHierarchyVisible } from './util/AcTrVisibility.js'
export { effectiveLayer } from './util/AcTrEffectiveLayer.js'
