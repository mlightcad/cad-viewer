/**
 * Tree-shakeable toolbar chrome entry for hosts that need {@link AcExToolbar}
 * without loading the full SimpleUiPlugin (dock panel, layer/review commands).
 *
 * Used by the offline HTML export viewer runtime.
 */

export {
  AcExToolbar,
  type AcExToolbarDocBridge,
  type AcExToolbarDocState,
  type AcExToolbarI18n,
  type AcExToolbarOptions
} from './ui/AcExToolbar'
export {
  AcExSubToolbar,
  type AcExSubToolbarOptions
} from './ui/AcExSubToolbar'
export { ensureUiStyles, removeUiStylesIfUnused } from './ui/styles'
export type {
  AcExToolbarChildIconMode,
  AcExToolbarChildrenUi,
  AcExToolbarItem,
  AcExToolbarOverflow,
  AcExToolbarPlacement,
  AcExToolbarSeparator
} from './config/types'
export {
  createToolbarSeparator,
  isToolbarSeparatorItem,
  resolveToolbarChildrenUi
} from './config/toolbarItemUtils'
