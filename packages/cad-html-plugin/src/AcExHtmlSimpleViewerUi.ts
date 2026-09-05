/**
 * Minimal UI surface from `cad-simple-viewer` for the offline HTML viewer runtime.
 *
 * Keep imports here so the viewer IIFE only pulls dialog/palette modules via
 * tree-shaking, not the full viewer package.
 *
 * @module AcExHtmlSimpleViewerUi
 * @packageDocumentation
 */

export {
  ACED_TOUCH_POINT_LONG_PRESS_MS,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX,
  AcUiAciColorDialog,
  AcUiFullscreenPanel,
  AcUiHelpPanel,
  acedIsMobileOrPadUi,
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial,
  type AcUiFullscreenPanelLabels,
  type AcUiFullscreenPanelOptions,
  type AcUiHelpPanelLabels,
  type AcUiHelpPanelOptions,
  type AcUiHelpPanelShowOptions,
  type AcUiTouchPointTutorialConfig,
  type AcUiTouchPointTutorialLabels,
  type AcUiTouchPointTutorialPrefs
} from '@mlightcad/cad-simple-viewer'
