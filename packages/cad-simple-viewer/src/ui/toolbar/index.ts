/**
 * Shared plain-DOM toolbar engine.
 *
 * @module ui/toolbar
 * @packageDocumentation
 */

export type {
  AcUiResolvedToolbarChrome
} from './resolveToolbarChrome.js'
export { acuiResolveToolbarChrome } from './resolveToolbarChrome.js'
export {
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemDisabled,
  acuiIsToolbarItemVisible,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem
} from './resolveToolbarItemState.js'
export {
  acuiCopyDynamicToolbarChildren,
  acuiCreateToolbarSeparator,
  acuiExpandToolbarItemConfigs,
  acuiIndexToolbarItems,
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarChildrenStrip,
  acuiIsToolbarPresetRef,
  acuiIsToolbarSeparatorItem,
  acuiPreserveDynamicToolbarChildren,
  acuiResolveToolbarChildrenUi,
  acuiToolbarItemsIncludeItem,
  acuiToolbarPreset
} from './toolbarItemUtils.js'
export type {
  AcUiDefaultToolbarContext,
  AcUiSubToolbarOptions,
  AcUiSubToolbarPosition,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarChromeOptions,
  AcUiToolbarDocState,
  AcUiToolbarI18n,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarOptions,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarSize
} from './types.js'
export { AcUiDropdownMenu } from './AcUiDropdownMenu.js'
export { AcUiSubToolbar } from './AcUiSubToolbar.js'
export type { AcUiSubToolbarMountOptions } from './AcUiSubToolbar.js'
export { AcUiToolbar } from './AcUiToolbar.js'
export type { AcUiToolbarMountOptions } from './AcUiToolbar.js'
export {
  acuiEnsureToolbarStyles,
  acuiRemoveToolbarStylesIfUnused
} from './AcUiToolbarStyles.js'
export { acuiComputeWrapPackSlot } from './acuiWrapPackLayout.js'
export {
  acuiCreateDefaultToolbarPresetMap,
  acuiCreateDefaultToolbarItems,
  acuiCreateOpenToolbarItem,
  acuiCreatePhoneToolbarItems,
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem,
  acuiCreateToolbarLayoutSwitcher,
  acuiMergeToolbarOptionsForLayout,
  acuiPrependToolbarLayoutSwitcher,
  acuiResolveDockMountTarget,
  acuiResolveToolbarItems,
  acuiResolveToolbarMountTarget
} from './simpleUiPresets.js'
export type {
  AcUiToolbarLayoutPreset,
  AcUiToolbarLayoutSwitcherOptions
} from './createToolbarLayoutSwitcher.js'
