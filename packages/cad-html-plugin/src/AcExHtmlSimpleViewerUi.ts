/**
 * Minimal UI surface from `cad-simple-viewer` for the offline HTML viewer runtime.
 *
 * Keep imports here so the viewer IIFE only pulls dialog/palette modules via
 * tree-shaking, not the full viewer package.
 *
 * @module AcExHtmlSimpleViewerUi
 * @packageDocumentation
 */

export { AcUiAciColorDialog } from '@mlightcad/cad-simple-viewer'
export {
  ACED_TOUCH_POINT_LONG_PRESS_MS,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX
} from '@mlightcad/cad-simple-viewer/touch-point-timing'
export {
  AcUiFullscreenPanel,
  AcUiHelpPanel,
  type AcUiFullscreenPanelLabels,
  type AcUiFullscreenPanelOptions,
  type AcUiHelpPanelLabels,
  type AcUiHelpPanelOptions,
  type AcUiHelpPanelShowOptions
} from '@mlightcad/cad-simple-viewer/fullscreen-panel'
export {
  acedIsMobileOrPadUi,
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial,
  type AcUiTouchPointTutorialConfig,
  type AcUiTouchPointTutorialLabels,
  type AcUiTouchPointTutorialPrefs
} from '@mlightcad/cad-simple-viewer'
