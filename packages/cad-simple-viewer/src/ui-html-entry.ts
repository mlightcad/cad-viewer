/**
 * Tree-shakeable UI surface for the offline HTML viewer-runtime IIFE.
 *
 * Vite aliases `@mlightcad/cad-simple-viewer` to this file when building
 * `viewer-runtime.iife.js` so the bundle never walks the full package barrel
 * (`app` / `command` / DocManager).
 *
 * @module ui-html-entry
 * @packageDocumentation
 */

export {
  ACED_TOUCH_POINT_LONG_PRESS_MS,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX
} from './editor/input/ui/AcEdTouchPointTiming'
export { AcEdEntityPickCancelChrome } from './editor/input/ui/AcEdEntityPickCancelChrome'
export {
  acedIsMobileOrPadUi,
  acedIsMobileUiLayout
} from './editor/global/AcEdUiLayout'
export { AcUiAciColorDialog } from './ui/AcUiAciColorDialog'
export type {
  AcUiAciColorDialogLabels,
  AcUiAciColorDialogOptions
} from './ui/AcUiAciColorDialog'
export { AcUiFullscreenPanel } from './ui/AcUiFullscreenPanel'
export type {
  AcUiFullscreenPanelLabels,
  AcUiFullscreenPanelOptions
} from './ui/AcUiFullscreenPanel'
export { AcUiHelpPanel } from './ui/AcUiHelpPanel'
export type {
  AcUiHelpPanelLabels,
  AcUiHelpPanelOptions,
  AcUiHelpPanelShowOptions
} from './ui/AcUiHelpPanel'
export { AcUiMobileSessionPanel } from './ui/AcUiMobileSessionPanel'
export type {
  AcUiMobileSessionPanelLabels,
  AcUiMobileSessionPanelOptions,
  AcUiMobileSessionPanelState,
  AcUiMobileSessionPanelCallbacks,
  AcUiMobileSessionKeyword,
  AcUiMobileSessionMetricTexts
} from './ui/AcUiMobileSessionPanel'
export { AcUiShortCutToolbar } from './ui/AcUiShortCutToolbar'
export type {
  AcUiShortCutToolbarActionState,
  AcUiShortCutToolbarOptions
} from './ui/AcUiShortCutToolbar'
export { AcUiSimpleToolbar } from './ui/AcUiSimpleToolbar'
export type { AcUiSimpleToolbarItem } from './ui/AcUiSimpleToolbar'
export { AcUiTextHeightDialog } from './ui/AcUiTextHeightDialog'
export type {
  AcUiTextHeightDialogLabels,
  AcUiTextHeightDialogOptions,
  AcUiTextHeightDialogResult,
  AcUiTextHeightMode
} from './ui/AcUiTextHeightDialog'
export {
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial
} from './ui/touch-point-tutorial'
export type {
  AcUiTouchPointTutorialConfig,
  AcUiTouchPointTutorialLabels,
  AcUiTouchPointTutorialPrefs
} from './ui/touch-point-tutorial'
export {
  createIconElement,
  ICON_CLOSE,
  ICON_ERASE,
  ICON_REDO,
  ICON_TEXT_HEIGHT,
  ICON_UNDO
} from './ui/icons'
