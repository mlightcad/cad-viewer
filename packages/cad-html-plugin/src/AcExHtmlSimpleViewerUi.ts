/**
 * Minimal UI surface from `cad-simple-viewer` for the offline HTML viewer runtime.
 *
 * Keep imports here so the viewer IIFE only pulls dialog/palette modules via
 * tree-shaking, not the full viewer package. The viewer Vite config aliases
 * `@mlightcad/cad-simple-viewer` to `ui-html-entry.ts` for that build.
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
  AcUiMobileSessionPanel,
  AcUiShortCutToolbar,
  AcUiSimpleToolbar,
  AcUiTextHeightDialog,
  acedIsMobileOrPadUi,
  acedIsMobileUiLayout,
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial,
  createIconElement,
  ICON_CLOSE,
  ICON_ERASE,
  ICON_REDO,
  ICON_TEXT_HEIGHT,
  ICON_UNDO,
  type AcUiFullscreenPanelLabels,
  type AcUiFullscreenPanelOptions,
  type AcUiHelpPanelLabels,
  type AcUiHelpPanelOptions,
  type AcUiHelpPanelShowOptions,
  type AcUiMobileSessionPanelLabels,
  type AcUiMobileSessionPanelOptions,
  type AcUiMobileSessionPanelState,
  type AcUiMobileSessionPanelCallbacks,
  type AcUiMobileSessionKeyword,
  type AcUiMobileSessionMetricTexts,
  type AcUiShortCutToolbarActionState,
  type AcUiShortCutToolbarOptions,
  type AcUiSimpleToolbarItem,
  type AcUiTextHeightDialogLabels,
  type AcUiTextHeightDialogOptions,
  type AcUiTextHeightDialogResult,
  type AcUiTextHeightMode,
  type AcUiTouchPointTutorialConfig,
  type AcUiTouchPointTutorialLabels,
  type AcUiTouchPointTutorialPrefs
} from '@mlightcad/cad-simple-viewer'
