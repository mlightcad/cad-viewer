/**
 * Built-in simple UI chrome for {@link AcApDocManager} embeds that are not
 * using the Vue `cad-editor` shell.
 *
 * Enable via {@link AcApDocManagerOptions.simpleUi} (default on) or by loading
 * {@link acuiCreateSimpleUiPlugin} into the plugin manager.
 */
export {
  AcApSimpleUiPlugin,
  acuiCreateSimpleUiPlugin
} from './createSimpleUiPlugin'
export {
  acuiRegisterSimpleUiPlugin,
  registerSimpleUiPlugin
} from './register'
export {
  acuiCreateToolbarLayoutSwitcher,
  acuiPrependToolbarLayoutSwitcher
} from './config/createToolbarLayoutSwitcher'
export type {
  AcUiToolbarLayoutPreset,
  AcUiToolbarLayoutSwitcherOptions
} from './config/createToolbarLayoutSwitcher'
export type {
  AcUiDefaultToolbarContext,
  AcUiDockPanelSide,
  AcUiLayoutOptions,
  AcUiLocale,
  AcUiPluginLayoutMode,
  AcUiSimpleUiPluginOptions,
  AcUiSubToolbarOptions,
  AcUiSubToolbarPosition,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarItemsInput,
  AcUiToolbarOptions,
  AcUiToolbarChromeOptions,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarOverflow,
  AcUiToolbarSize,
  AcUiToolbarPlacement
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export {
  acuiCreateDefaultToolbarPresetMap,
  acuiResolveToolbarItems
} from './config/resolveToolbarItems'
export {
  acuiCreateDefaultToolbarItems,
  acuiCreateOpenToolbarItem,
  acuiCreatePhoneToolbarItems,
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem
} from './config/defaultToolbarItems'
export { acuiMergeToolbarOptionsForLayout } from './config/mergeToolbarOptionsForLayout'
export { acuiResolveToolbarChrome } from './config/resolveToolbarChrome'
export type { AcUiResolvedToolbarChrome } from './config/resolveToolbarChrome'
export {
  acuiCreateToolbarSeparator,
  acuiToolbarPreset
} from './config/toolbarItemUtils'
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
export { AcUiFindPaletteView } from './ui/AcUiFindPaletteView'
export { AcUiReviewPaletteView } from './ui/AcUiReviewPaletteView'
export { AcUiMeasurementPaletteView } from './ui/AcUiMeasurementPaletteView'
export { AcUiLayerListView } from './ui/AcUiLayerListView'
export type { AcUiToolbarMountOptions } from '../ui'
export { AcUiToolbar, AcUiDockPanel } from '../ui'
export type { AcUiDockPanelTab } from '../ui'
export type { AcApLayerInfo } from '../service'
export { AcApLayerStore } from '../service'
/** Same module graph as the palette views (avoids lib vs src DocManager clash). */
export { AcApDocManager, AcApI18n } from './deps'
