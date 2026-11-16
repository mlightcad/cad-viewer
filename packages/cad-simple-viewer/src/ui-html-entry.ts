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
  acedApplyCanvasTouchCalloutStyles,
  acedClearDomSelection,
  acedGuardCanvasTouchCallout
} from './editor/input/ui/AcEdCanvasTouchCalloutGuard.js'
export { AcEdEntityPickCancelChrome } from './editor/input/ui/AcEdEntityPickCancelChrome.js'
export {
  ACED_TOUCH_POINT_LONG_PRESS_MS,
  ACED_TOUCH_POINT_MOVE_CANCEL_PX
} from './editor/input/ui/AcEdTouchPointTiming.js'
export {
  acedIsMobileOrPadUi,
  acedIsMobileUiLayout
} from './editor/global/AcEdUiLayout.js'
export { AcUiAciColorDialog } from './ui/AcUiAciColorDialog.js'
export type {
  AcUiAciColorDialogLabels,
  AcUiAciColorDialogOptions
} from './ui/AcUiAciColorDialog.js'
export { AcUiFullscreenPanel } from './ui/AcUiFullscreenPanel.js'
export type {
  AcUiFullscreenPanelLabels,
  AcUiFullscreenPanelOptions
} from './ui/AcUiFullscreenPanel.js'
export { AcUiHelpPanel } from './ui/AcUiHelpPanel.js'
export type {
  AcUiHelpPanelLabels,
  AcUiHelpPanelOptions,
  AcUiHelpPanelShowOptions
} from './ui/AcUiHelpPanel.js'
export { AcUiMobileSessionPanel } from './ui/AcUiMobileSessionPanel.js'
export type {
  AcUiMobileSessionPanelLabels,
  AcUiMobileSessionPanelOptions,
  AcUiMobileSessionPanelState,
  AcUiMobileSessionPanelCallbacks,
  AcUiMobileSessionKeyword,
  AcUiMobileSessionMetricTexts
} from './ui/AcUiMobileSessionPanel.js'
export { AcUiShortCutToolbar } from './ui/AcUiShortCutToolbar.js'
export type {
  AcUiShortCutToolbarActionState,
  AcUiShortCutToolbarOptions
} from './ui/AcUiShortCutToolbar.js'
export { AcUiSimpleToolbar } from './ui/AcUiSimpleToolbar.js'
export type { AcUiSimpleToolbarItem } from './ui/AcUiSimpleToolbar.js'
export { AcEdOpenMode } from './editor/view/AcEdOpenMode.js'
export { AcUiToolbar } from './ui/toolbar/AcUiToolbar.js'
export type { AcUiToolbarMountOptions } from './ui/toolbar/AcUiToolbar.js'
export {
  acuiEnsureToolbarStyles,
  acuiRemoveToolbarStylesIfUnused
} from './ui/toolbar/AcUiToolbarStyles.js'
export { acuiCopyDynamicToolbarChildren } from './ui/toolbar/toolbarItemUtils.js'
export type {
  AcUiToolbarDocState,
  AcUiToolbarI18n,
  AcUiToolbarItem,
  AcUiToolbarPlacement,
  AcUiToolbarChildrenUi
} from './ui/toolbar/types.js'
export { AcUiTextHeightDialog } from './ui/AcUiTextHeightDialog.js'
export type {
  AcUiTextHeightDialogLabels,
  AcUiTextHeightDialogOptions,
  AcUiTextHeightDialogResult,
  AcUiTextHeightMode
} from './ui/AcUiTextHeightDialog.js'
export {
  acuiLocalIsoDate,
  acuiShouldShowTouchPointTutorialFromPrefs,
  AcUiTouchPointTutorial
} from './ui/touch-point-tutorial.js'
export type {
  AcUiTouchPointTutorialConfig,
  AcUiTouchPointTutorialLabels,
  AcUiTouchPointTutorialPrefs
} from './ui/touch-point-tutorial.js'
export {
  createIconElement,
  ICON_CLOSE,
  ICON_ERASE,
  ICON_REDO,
  ICON_TEXT_HEIGHT,
  ICON_UNDO
} from './ui/icons.js'
