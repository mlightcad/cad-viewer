/**
 * Text search for the FIND dock tab (see `README.md` → "Find text").
 *
 * The search itself lives in `@mlightcad/cad-simple-viewer/find` so that this
 * plugin and the full Vue `cad-viewer` UI share one implementation and behave
 * identically. This module keeps the plugin's public `acui*` names.
 *
 * Searched fields: `TEXT`, `MTEXT` (formatting codes removed), attribute
 * values of `INSERT`s, `TEXT` / `MTEXT` / `ATTRIB` and constant `ATTDEF`
 * values inside block definitions, and the text of dimensions, multileaders
 * and tables. Non-constant `ATTDEF` templates, `ATTDEF`s loose in a layout
 * and xrefs are not searched. See `@mlightcad/cad-simple-viewer/find`.
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
