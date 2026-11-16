export {
  BATCH_SLOT_ID_ATTRIBUTE,
  ensureSlotIdAttribute,
  writeSlotIdRange
} from './AcTrBatchSlotId.js'
export {
  AcTrBatchHighlightState,
  COMPARE_ROLE_ADDED,
  COMPARE_ROLE_DELETED,
  COMPARE_ROLE_MODIFIED,
  COMPARE_ROLE_NONE,
  compareRoleToMaskValue,
  type AcTrBatchCompareRole,
  type AcTrBatchHighlightKind
} from './AcTrBatchHighlightState.js'
export {
  bindBatchHighlightUniforms,
  installBatchHighlightRenderer,
  patchMaterialForBatchHighlight
} from './AcTrBatchHighlightShaders.js'
