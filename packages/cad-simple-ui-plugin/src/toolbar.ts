/**
 * Tree-shakeable toolbar chrome entry for hosts that need {@link AcUiToolbar}
 * without loading the full SimpleUiPlugin (dock panel, layer/review commands).
 *
 * Used by the offline HTML export viewer runtime.
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
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
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
  acuiGetLayoutKind,
  acuiIsCompactLayout,
  acuiIsMobileLayout,
  ML_EX_UI_COMPACT_MAX_WIDTH,
  ML_EX_UI_COMPACT_MEDIA_QUERY,
  ML_EX_UI_MOBILE_MAX_WIDTH,
  ML_EX_UI_MOBILE_MEDIA_QUERY
} from './ui/uiLayout'

