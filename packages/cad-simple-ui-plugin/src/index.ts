/**
 * Public entry point for {@link SIMPLE_UI_PLUGIN_NAME}.
 *
 * Re-exports the plugin factory, registration helper, configuration types,
 * i18n utilities, and layer service.
 */
export { AcApSimpleUiPlugin, createSimpleUiPlugin } from './createSimpleUiPlugin'
export { registerSimpleUiPlugin } from './register'
export type {
  AcExDefaultToolbarContext,
  AcExLayerInfo,
  AcExLocale,
  AcExSimpleUiPluginOptions,
  AcExToolbarItem,
  AcExToolbarItemConfig,
  AcExToolbarChildIconMode,
  AcExToolbarPresetRef,
  AcExToolbarSeparator,
  AcExToolbarPlacement
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export { createDefaultToolbarPresetMap } from './config/resolveToolbarItems'
export {
  createToolbarSeparator,
  toolbarPreset
} from './config/toolbarItemUtils'
export { AcExI18n, registerSimpleUiI18n } from './i18n'
export { AcExLayerService } from './service/AcExLayerService'
