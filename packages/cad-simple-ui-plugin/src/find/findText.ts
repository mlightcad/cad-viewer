/**
 * Text search for the FIND dock tab (see `README.md` → "Find text").
 *
 * The search itself lives in `@mlightcad/cad-simple-viewer/find` so that this
 * plugin and the full Vue `cad-viewer` UI share one implementation and behave
 * identically. This module keeps the plugin's public `acui*` names.
 *
 * Searched fields: `TEXT`, `MTEXT` (formatting codes removed) and block
 * attribute values of top-level `INSERT`s; text inside block definitions,
 * dimension text, leaders, tables and xrefs is not searched.
 */
export {
  ACAP_FIND_MAX_RESULTS as ACUI_FIND_MAX_RESULTS,
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
  acapNormalizeFindText as acuiNormalizeFindText
} from '@mlightcad/cad-simple-viewer/find'
