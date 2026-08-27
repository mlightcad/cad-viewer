/**
 * Tree-shakeable toolbar chrome entry for hosts that need {@link AcUiToolbar}
 * without loading the full SimpleUiPlugin (dock panel, layer/review commands).
 *
 * Used by the offline HTML export viewer runtime.
 *
 * For config-driven mount + layout switching, import {@link acuiSetupToolbar}
 * from `@mlightcad/cad-simple-ui-plugin/setup-toolbar` or use the thin HTML
 * wrapper {@link setupAcExHtmlSimpleToolbar}.
 */

export {
  AcUiToolbar,
  type AcUiToolbarDocBridge,
  type AcUiToolbarDocState,
  type AcUiToolbarI18n,
  type AcUiToolbarOptions
} from './ui/AcUiToolbar'
export {
  AcUiSubToolbar,
  type AcUiSubToolbarOptions
} from './ui/AcUiSubToolbar'
export { acuiEnsureUiStyles, acuiRemoveUiStylesIfUnused } from './ui/styles'
export type {
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarConfig,
  AcUiToolbarContentWidth,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarItemDistribution,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiLayoutKind,
  AcUiLayoutOptions
} from './config/types'
export {
  acuiCreateToolbarSeparator,
  acuiExpandToolbarItemConfigs,
  acuiInsertToolbarItemsAt,
  acuiIsToolbarSeparatorItem,
  acuiResolveToolbarChildrenUi,
  acuiToolbarPreset
} from './config/toolbarItemUtils'
export {
  acuiMergeToolbarConfigs,
  acuiResolveLayoutToolbarConfig,
  acuiResolveToolbarItemsFromPresets
} from './config/toolbarConfig'
export {
  acuiGetLayoutKind,
  acuiIsCompactLayout,
  acuiIsMobileLayout,
  ML_EX_UI_COMPACT_MAX_WIDTH,
  ML_EX_UI_COMPACT_MEDIA_QUERY,
  ML_EX_UI_MOBILE_MAX_WIDTH,
  ML_EX_UI_MOBILE_MEDIA_QUERY
} from './ui/uiLayout'
