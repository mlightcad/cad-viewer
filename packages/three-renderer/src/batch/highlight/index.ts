export {
  BATCH_SLOT_ID_ATTRIBUTE,
  ensureSlotIdAttribute,
  writeSlotIdRange
} from './AcTrBatchSlotId'
export {
  AcTrBatchHighlightState,
  type AcTrBatchHighlightKind
} from './AcTrBatchHighlightState'
export {
  bindBatchHighlightUniforms,
  installBatchHighlightRenderer,
  patchMaterialForBatchHighlight
} from './AcTrBatchHighlightShaders'
