export * from './findDrawing'
export * from './findText'
export * from './AcApFindNavigator'

import {
  type AcApFindBox,
  type AcApFindDrawingOptions,
  type AcApFindDrawingResult,
  acapFindHitBox,
  type AcApFindLayoutHit,
  type AcApFindLayoutInfo,
  type AcApFindScope,
  acapFindText,
  acapListFindLayouts
} from './findDrawing'
import {
  ACAP_FIND_MAX_RESULTS,
  type AcApFindBlockTableRecordLike,
  type AcApFindDatabaseLike,
  acapFindExcerpt,
  type AcApFindHit,
  type AcApFindHitKind,
  type AcApFindOptions,
  type AcApFindResult,
  acapFindTextInLayout,
  acapMTextToPlainText,
  acapNormalizeFindText,
  acapResolveFindBlockTableRecord
} from './findText'

/**
 * Legacy `acui*` aliases kept for simple-ui call sites and older imports.
 * Prefer the `acap*` names from this module.
 */
export {
  ACAP_FIND_MAX_RESULTS as ACUI_FIND_MAX_RESULTS,
  type AcApFindBlockTableRecordLike as AcUiFindBlockTableRecordLike,
  type AcApFindBox as AcUiFindBox,
  type AcApFindDatabaseLike as AcUiFindDatabaseLike,
  type AcApFindDrawingOptions as AcUiFindDrawingOptions,
  type AcApFindDrawingResult as AcUiFindDrawingResult,
  type AcApFindHit as AcUiFindHit,
  type AcApFindHitKind as AcUiFindHitKind,
  type AcApFindLayoutHit as AcUiFindLayoutHit,
  type AcApFindLayoutInfo as AcUiFindLayoutInfo,
  type AcApFindOptions as AcUiFindOptions,
  type AcApFindResult as AcUiFindResult,
  type AcApFindScope as AcUiFindScope,
  acapFindExcerpt as acuiFindExcerpt,
  acapFindHitBox as acuiFindHitBox,
  acapFindText as acuiFindText,
  acapFindTextInLayout as acuiFindTextInLayout,
  acapListFindLayouts as acuiListFindLayouts,
  acapMTextToPlainText as acuiMTextToPlainText,
  acapNormalizeFindText as acuiNormalizeFindText,
  acapResolveFindBlockTableRecord as acuiResolveFindBlockTableRecord
}
